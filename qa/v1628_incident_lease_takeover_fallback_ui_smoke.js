#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class SharedStorage {
    constructor(initial = {}) {
        this.values = new Map(Object.entries(initial).map(([key, value]) => [String(key), String(value)]));
        this.failNextLockWrite = false;
    }
    get length() { return this.values.size; }
    key(index) { return Array.from(this.values.keys())[index] ?? null; }
    getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
    setItem(key, value) {
        const safeKey = String(key);
        if (this.failNextLockWrite && safeKey.endsWith(':flush-lock-v1')) {
            this.failNextLockWrite = false;
            throw new Error('simulated lock storage failure');
        }
        this.values.set(safeKey, String(value));
    }
    removeItem(key) { this.values.delete(String(key)); }
}

class EventHub {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) {
        const values = this.listeners.get(type) || new Set();
        values.add(listener);
        this.listeners.set(type, values);
    }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    dispatchEvent(event) {
        for (const listener of this.listeners.get(event?.type) || []) listener(event);
        return true;
    }
    emit(type, detail = {}) { return this.dispatchEvent({ type, ...detail }); }
}

class FakeDocument extends EventHub {
    constructor() {
        super();
        this.visibilityState = 'visible';
        this.nodes = new Map();
    }
    getElementById(id) {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, {
                id,
                textContent: '',
                title: '',
                dataset: {},
                removeAttribute(name) { if (name === 'title') this.title = ''; }
            });
        }
        return this.nodes.get(id);
    }
}

function createTab(storage, tabId, options = {}) {
    const events = options.events || new EventHub();
    const document = options.document || new FakeDocument();
    const context = {
        console,
        Date,
        Math,
        JSON,
        Map,
        Set,
        Object,
        Array,
        String,
        Number,
        Boolean,
        RegExp,
        Error,
        TypeError,
        Promise,
        TextEncoder,
        encodeURIComponent,
        unescape,
        AbortController,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        localStorage: storage,
        navigator: { onLine: true },
        document,
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
        dispatchEvent: events.dispatchEvent.bind(events),
        BroadcastChannel: undefined
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(read('src/boot/incident-support-service.js'), context, { filename: 'incident-support-service.js' });
    vm.runInContext(read('src/boot/incident-local-queue-service.js'), context, { filename: 'incident-local-queue-service.js' });
    vm.runInContext(read('src/boot/incident-queue-coordination-service.js'), context, { filename: 'incident-queue-coordination-service.js' });
    vm.runInContext(read('src/boot/incident-diagnostics-view-service.js'), context, { filename: 'incident-diagnostics-view-service.js' });
    const coordinator = context.FoxBearIncidentQueueCoordination.createCoordinator({
        key: options.key || 'incident-v1628:queue',
        tabId,
        storage,
        navigator: context.navigator,
        eventTarget: events,
        document,
        BroadcastChannel: undefined,
        AbortController,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        fallbackPollMs: options.fallbackPollMs || 50,
        idlePollMs: options.idlePollMs || 50,
        hiddenPollMs: options.hiddenPollMs || 200,
        leaseSettleMs: 0,
        leaseTtlMs: options.leaseTtlMs || 1200,
        maxItems: 8,
        maxSerializedBytes: 8192,
        now: options.now
    });
    return { context, coordinator, events, document };
}

function payload(index, tab = 'a') {
    return {
        fingerprint: `${tab}-${index}`,
        clientAt: new Date(Date.UTC(2026, 6, 28, 9, 0, 0, index % 1000)).toISOString(),
        message: `message-${tab}-${index}`,
        automatic: true
    };
}

async function main() {
    const pkg = JSON.parse(read('package.json'));
    assert.strictEqual(pkg.version, '1.6.112');
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');
    assert(pkg.qaChecks.includes('node --check src/boot/incident-diagnostics-view-service.js'));
    assert(pkg.qaChecks.includes('node qa/v1628_incident_lease_takeover_fallback_ui_smoke.js'));

    const storage = new SharedStorage();
    const tabA = createTab(storage, 'tab-a');
    const tabB = createTab(storage, 'tab-b');
    assert.strictEqual(tabA.context.FoxBearIncidentQueueCoordination.version, '1.6.112');
    assert.strictEqual(tabA.context.FoxBearIncidentDiagnosticsView.version, '1.6.112');
    assert.strictEqual(tabB.coordinator.getState().syncMode, 'storage-polling');

    let pollingPeerEvents = 0;
    tabB.coordinator.subscribe(detail => { if (detail.source === 'peer') pollingPeerEvents += 1; });
    tabA.coordinator.enqueue(payload(1, 'a'));
    await delay(140);
    assert(pollingPeerEvents >= 1, 'polling fallback must observe peer writes without BroadcastChannel or a dispatched storage event');
    assert(tabB.coordinator.getState().fallbackChanges >= 1);
    assert.deepStrictEqual(Array.from(tabB.coordinator.load(), item => item.fingerprint), ['a-1']);

    for (let index = 0; index < 200; index += 1) {
        (index % 2 ? tabA.coordinator : tabB.coordinator).enqueue(payload(index + 10, index % 2 ? 'a' : 'b'));
    }
    assert.strictEqual(tabA.coordinator.count(), 8, 'fallback-only multi-tab write pressure must retain the global bound');
    assert.deepStrictEqual(Array.from(tabA.coordinator.load(), item => item.fingerprint), ['b-202', 'a-203', 'b-204', 'a-205', 'b-206', 'a-207', 'b-208', 'a-209']);

    const crashStorage = new SharedStorage({
        'crash-v1628:queue:flush-lock-v1': JSON.stringify({ owner: 'dead-tab', token: 'dead-token', expiresAt: 1000, generation: 7 })
    });
    const crashedSuccessor = createTab(crashStorage, 'successor', { key: 'crash-v1628:queue', now: () => 2000 });
    const takeover = await crashedSuccessor.coordinator.runExclusive(async owner => ({ owner: owner.isOwner(), mode: owner.mode }));
    assert.strictEqual(takeover.acquired, true, 'an expired crash lease must be immediately reclaimable');
    assert.strictEqual(takeover.value.owner, true);
    assert.strictEqual(crashedSuccessor.coordinator.getState().staleLeaseTakeovers, 1);

    const bfcacheStorage = new SharedStorage();
    const pageTab = createTab(bfcacheStorage, 'page-tab', { key: 'bfcache-v1628:queue' });
    const peerTab = createTab(bfcacheStorage, 'peer-tab', { key: 'bfcache-v1628:queue' });
    const activeRun = pageTab.coordinator.runExclusive(owner => new Promise(resolve => {
        owner.signal.addEventListener('abort', () => resolve('released-for-pagehide'), { once: true });
    }));
    await delay(30);
    pageTab.events.emit('pagehide', { persisted: true });
    const pageResult = await activeRun;
    assert.strictEqual(pageResult.value, 'released-for-pagehide');
    assert.strictEqual(pageTab.coordinator.getState().bfcacheReleases, 1);
    const peerAfterHide = await peerTab.coordinator.runExclusive(async owner => owner.isOwner());
    assert.strictEqual(peerAfterHide.acquired, true, 'BFCache pagehide must release lease without waiting for TTL expiry');
    assert.strictEqual(peerAfterHide.value, true);

    const renewalStorage = new SharedStorage();
    const renewalTab = createTab(renewalStorage, 'renewal-tab', { key: 'renewal-v1628:queue', leaseTtlMs: 1200 });
    const renewalRun = renewalTab.coordinator.runExclusive(owner => new Promise(resolve => {
        owner.signal.addEventListener('abort', () => resolve(owner.signal.reason?.code || 'aborted'), { once: true });
    }));
    await delay(60);
    renewalStorage.failNextLockWrite = true;
    const renewalResult = await renewalRun;
    assert.strictEqual(renewalResult.acquired, true);
    assert.strictEqual(renewalResult.value, 'FOXBEAR_INCIDENT_QUEUE_OWNERSHIP_LOST');
    assert.strictEqual(renewalTab.coordinator.getState().leaseRenewalFailures, 1, 'failed lease renewal must abort active delivery ownership');

    const view = tabA.context.FoxBearIncidentDiagnosticsView;
    const item = (text, tone = 'neutral', title = '') => ({ text, tone, title });
    const serviceRender = view.renderService(tabA.document, {
        server: item('서버 정상', 'ok'),
        functionStatus: item('함수 정상', 'ok'),
        endpointStatus: item('endpoint', 'neutral', 'https://example.invalid'),
        sameOriginStatus: item('same origin', 'ok'),
        directStatus: item('direct', 'ok'),
        cspStatus: item('csp', 'ok'),
        appCheckStatus: item('app check', 'warning')
    });
    assert.strictEqual(serviceRender.rendered, 7);
    assert.strictEqual(tabA.document.getElementById('incidentServiceStatus').dataset.tone, 'ok');
    assert.strictEqual(tabA.document.getElementById('incidentEndpointStatus').title, 'https://example.invalid');
    const queueStatus = view.renderQueue(tabA.document, { queueRecovered: 3 }, {
        queueCount: 2,
        peerShardCount: 1,
        lockOwnedByPeer: true,
        syncMode: 'storage-polling',
        staleLeaseTakeovers: 2
    });
    assert.strictEqual(queueStatus.tone, 'warning');
    assert(queueStatus.text.includes('호환 동기화 사용 중'));
    assert(queueStatus.text.includes('강제 종료 인계 2회'));

    let emitted = null;
    tabA.events.addEventListener('foxbear:test-status', event => { emitted = event.detail; });
    assert.strictEqual(view.emitStatus(tabA.context, 'foxbear:test-status', { reason: 'lease-takeover', value: 1 }), true);
    assert.strictEqual(emitted.reason, 'lease-takeover');

    const html = read('index.html');
    const sw = read('sw.js');
    const reporter = read('src/boot/incident-reporter.js');
    const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
    const diagnosticsIndex = html.indexOf('src/boot/incident-service-diagnostics.js');
    const viewIndex = html.indexOf('src/boot/incident-diagnostics-view-service.js');
    const reporterIndex = html.indexOf('src/boot/incident-reporter.js');
    assert(diagnosticsIndex >= 0 && diagnosticsIndex < viewIndex && viewIndex < reporterIndex);
    assert(sw.includes(`./src/boot/incident-diagnostics-view-service.js?v=${pkg.foxbearRelease.assetVersion}`));
    assert(reporter.includes('diagnosticsView.renderService(document, model)'));
    assert(reporter.includes('diagnosticsView.renderQueue(document, metrics, incidentQueue.getState())'));
    assert(reporter.includes('diagnosticsView.emitStatus(global, INCIDENT_STATUS_EVENT'));
    assert(handoff.requiredRuntimeAssets.includes('src/boot/incident-diagnostics-view-service.js'));
    assert(handoff.requiredFiles.includes('docs/V1.6.28_INCIDENT_LEASE_TAKEOVER_FALLBACK_UI_SAFETY.md'));

    const beforeDisposePolls = tabA.coordinator.getState().fallbackPolls;
    tabA.coordinator.dispose();
    tabB.coordinator.dispose();
    crashedSuccessor.coordinator.dispose();
    pageTab.coordinator.dispose();
    peerTab.coordinator.dispose();
    renewalTab.coordinator.dispose();
    await delay(90);
    assert.strictEqual(tabA.coordinator.getState().fallbackPolls, beforeDisposePolls, 'dispose must stop fallback polling');

    console.log('v1.6.28 crash lease takeover, BFCache release, fallback polling, renewal abort, and diagnostics view smoke passed');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
