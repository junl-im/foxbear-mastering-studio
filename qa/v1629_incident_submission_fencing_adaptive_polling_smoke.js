#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class Storage {
    constructor(limit = Infinity) { this.values = new Map(); this.limit = limit; }
    get length() { return this.values.size; }
    key(index) { return Array.from(this.values.keys())[index] ?? null; }
    getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
    setItem(key, value) {
        const text = String(value);
        if (text.length > this.limit) throw new Error('quota exceeded');
        this.values.set(String(key), text);
    }
    removeItem(key) { this.values.delete(String(key)); }
}

class Events {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, fn) { const set = this.listeners.get(type) || new Set(); set.add(fn); this.listeners.set(type, set); }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    emit(type, detail = {}) { for (const fn of this.listeners.get(type) || []) fn({ type, ...detail }); }
}

function createNode(id) {
    const listeners = new Map();
    return {
        id,
        textContent: '',
        disabled: false,
        title: '',
        dataset: {},
        attrs: {},
        setAttribute(name, value) { this.attrs[name] = String(value); },
        removeAttribute(name) { delete this.attrs[name]; },
        addEventListener(type, fn) { listeners.set(type, fn); },
        click() { listeners.get('click')?.({ target: this }); }
    };
}

class Document extends Events {
    constructor() { super(); this.visibilityState = 'visible'; this.nodes = new Map(); }
    getElementById(id) { if (!this.nodes.has(id)) this.nodes.set(id, createNode(id)); return this.nodes.get(id); }
}

function createContext(storage, options = {}) {
    const events = new Events();
    const document = new Document();
    const context = {
        console, Date, Math, JSON, Map, Set, Object, Array, String, Number, Boolean, RegExp, Error, TypeError, Promise,
        TextEncoder, AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
        localStorage: storage,
        navigator: { onLine: true },
        document,
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
        dispatchEvent() { return true; },
        BroadcastChannel: undefined
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    for (const file of [
        'src/boot/incident-support-service.js',
        'src/boot/incident-submission-identity-service.js',
        'src/boot/incident-local-queue-service.js',
        'src/boot/incident-queue-coordination-service.js',
        'src/boot/incident-controls-view-service.js'
    ]) vm.runInContext(read(file), context, { filename: file });
    const coordinator = context.FoxBearIncidentQueueCoordination.createCoordinator({
        key: options.key || 'incident-v1629:queue',
        tabId: options.tabId || 'tab-a',
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
        fallbackPollMs: 40,
        idlePollMs: 140,
        hiddenPollMs: 360,
        leaseSettleMs: 0,
        leaseTtlMs: 1200,
        maxItems: 8,
        maxSerializedBytes: 8192
    });
    return { context, coordinator, events, document };
}

function payload(index) {
    return {
        fingerprint: `fp-${index}`,
        clientAt: new Date(Date.UTC(2026, 6, 28, 9, 30, 0, index % 1000)).toISOString(),
        submissionKey: `inc_${String(index).padStart(16, '0')}`,
        message: `incident-${index}`,
        automatic: true
    };
}

async function main() {
    const pkg = JSON.parse(read('package.json'));
    assert.strictEqual(pkg.version, '1.6.101');
    assert.match(pkg.foxbearRelease.buildId, /^[a-z0-9][a-z0-9-]*$/, 'current release build ID must remain valid kebab-case');
    assert(read('CHANGELOG.md').includes('# v1.6.29 - Stable Incident Submission Fencing and Adaptive Polling'), 'v1.6.29 feature history must remain documented');
    assert(pkg.qaChecks.includes('node --check src/boot/incident-submission-identity-service.js'));
    assert(pkg.qaChecks.includes('node --check src/boot/incident-controls-view-service.js'));
    assert(pkg.qaChecks.includes('node qa/v1629_incident_submission_fencing_adaptive_polling_smoke.js'));

    const storage = new Storage();
    const tab = createContext(storage);
    const identity = tab.context.FoxBearIncidentSubmissionIdentity;
    assert.strictEqual(identity.version, '1.6.101');
    const clientAt = '2026-07-28T09:31:00.000Z';
    const firstKey = identity.createSubmissionKey({ fingerprint: 'same-error', clientAt });
    const secondKey = identity.createSubmissionKey({ fingerprint: 'same-error', clientAt });
    assert.strictEqual(firstKey, secondKey, 'same incident occurrence must retain one stable submission key');
    assert.strictEqual(identity.createReportId('guest-1', { fingerprint: 'same-error', clientAt }), `guest-1_${firstKey}`);
    assert.notStrictEqual(identity.createSubmissionKey({ fingerprint: 'same-error', clientAt: '2026-07-28T10:01:00.000Z' }), firstKey, 'a later occurrence must not collapse into the old report');

    assert.strictEqual(tab.coordinator.getState().currentPollMs, 140, 'visible empty tabs must use idle polling');
    tab.coordinator.enqueue(payload(1));
    assert.strictEqual(tab.coordinator.getState().currentPollMs, 50, 'queued work must switch polling to active cadence');
    tab.document.visibilityState = 'hidden';
    tab.document.emit('visibilitychange');
    assert.strictEqual(tab.coordinator.getState().currentPollMs, 360, 'hidden tabs must use the slowest polling cadence');
    tab.document.visibilityState = 'visible';
    tab.document.emit('visibilitychange');
    assert.strictEqual(tab.coordinator.getState().currentPollMs, 0, 'foreground resume must schedule an immediate resync');
    await delay(10);
    assert(tab.coordinator.getState().pollScheduleChanges >= 4);

    let capturedOwner = null;
    const ownershipRun = tab.coordinator.runExclusive(owner => new Promise(resolve => {
        capturedOwner = owner;
        owner.signal.addEventListener('abort', () => resolve(owner.signal.reason?.code || 'aborted'), { once: true });
    }));
    await delay(20);
    assert(capturedOwner && capturedOwner.generation >= 1);
    const lockKey = 'incident-v1629:queue:flush-lock-v1';
    const currentLease = JSON.parse(storage.getItem(lockKey));
    storage.setItem(lockKey, JSON.stringify({ ...currentLease, generation: currentLease.generation + 1 }));
    tab.events.emit('storage', { key: lockKey, newValue: storage.getItem(lockKey) });
    const ownershipResult = await ownershipRun;
    assert.strictEqual(ownershipResult.value, 'FOXBEAR_INCIDENT_QUEUE_OWNERSHIP_LOST');
    assert(tab.coordinator.getState().generationMismatchAborts >= 1, 'same-token generation changes must fence out stale owners');
    const fencedLease = JSON.parse(storage.getItem(lockKey));
    assert.strictEqual(fencedLease.generation, currentLease.generation + 1, 'stale owner cleanup must not delete the replacement generation lease');

    const quotaStorage = new Storage(760);
    const quotaTab = createContext(quotaStorage, { key: 'quota-v1629:queue', tabId: 'quota-tab' });
    for (let index = 0; index < 500; index += 1) quotaTab.coordinator.enqueue({ ...payload(index + 20), message: 'x'.repeat(420) });
    assert(quotaTab.coordinator.count() <= 8, 'quota pressure must never bypass the global queue bound');
    assert(quotaTab.coordinator.getState().storageFailures > 0, 'quota failures must remain observable without throwing');

    const controls = tab.context.FoxBearIncidentControlsView;
    assert.strictEqual(controls.version, '1.6.101');
    const nodes = controls.render(tab.document, {
        enabled: true,
        queued: 2,
        dailyCount: 3,
        maxDaily: 12,
        testInFlight: false,
        serviceCheckInFlight: false,
        recovery: { inFlight: false, waitingForOnline: false, lastResult: { ok: true, queueRemaining: 2 } },
        deployment: { inFlight: false, ready: true, remainingSeconds: 0 },
        deployCommand: 'npm run deploy:incident',
        now: Date.now()
    });
    assert.strictEqual(nodes.toggle.textContent, '자동 신고 켜짐');
    assert.strictEqual(nodes.recoveryStatus.dataset.tone, 'ok');
    assert.strictEqual(nodes.deployCopyButton.dataset.command, 'npm run deploy:incident');
    let clicks = 0;
    assert.strictEqual(controls.bindOnce(nodes.toggle, 'toggle', 'click', () => { clicks += 1; }), true);
    assert.strictEqual(controls.bindOnce(nodes.toggle, 'toggle', 'click', () => { clicks += 100; }), false);
    nodes.toggle.click();
    assert.strictEqual(clicks, 1, 'control binding must remain idempotent');

    const firebaseSource = read('src/firebase-bootstrap.js');
    const functionsSource = read('functions/index.js');
    const reporterSource = read('src/boot/incident-reporter.js');
    const rules = read('firestore.rules');
    assert(firebaseSource.includes('identity.createReportId(uid, payload)'));
    assert(functionsSource.includes('function incidentSubmissionKey'));
    assert(functionsSource.includes('submissionKey: incident.submissionKey || incidentSubmissionKey(incident)'));
    assert(reporterSource.includes('FOXBEAR_INCIDENT_SUBMISSION_IDENTITY_MISMATCH'));
    assert(reporterSource.includes('ownershipGeneration: owner.generation'));
    assert(rules.includes("'submissionKey'"));

    quotaTab.coordinator.dispose();
    tab.coordinator.dispose();
    console.log('PASS v1.6.29 incident submission fencing, adaptive polling, quota stress, and controls view split');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
