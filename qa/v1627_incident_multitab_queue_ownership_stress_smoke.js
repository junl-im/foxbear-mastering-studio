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
        this.values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
    }
    get length() { return this.values.size; }
    key(index) { return Array.from(this.values.keys())[index] ?? null; }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(String(key), String(value)); }
    removeItem(key) { this.values.delete(String(key)); }
}

class FakeBroadcastChannel {
    static channels = new Map();
    constructor(name) {
        this.name = String(name);
        this.listeners = new Set();
        const peers = FakeBroadcastChannel.channels.get(this.name) || new Set();
        peers.add(this);
        FakeBroadcastChannel.channels.set(this.name, peers);
    }
    addEventListener(type, listener) { if (type === 'message' && typeof listener === 'function') this.listeners.add(listener); }
    postMessage(data) {
        for (const peer of FakeBroadcastChannel.channels.get(this.name) || []) {
            if (peer === this) continue;
            for (const listener of peer.listeners) listener({ data });
            if (typeof peer.onmessage === 'function') peer.onmessage({ data });
        }
    }
    close() {
        const peers = FakeBroadcastChannel.channels.get(this.name);
        peers?.delete(this);
        if (peers && peers.size === 0) FakeBroadcastChannel.channels.delete(this.name);
        this.listeners.clear();
    }
}

function createTab(storage, tabId) {
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
        addEventListener() {},
        removeEventListener() {},
        BroadcastChannel: FakeBroadcastChannel
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(read('src/boot/incident-support-service.js'), context, { filename: 'incident-support-service.js' });
    vm.runInContext(read('src/boot/incident-local-queue-service.js'), context, { filename: 'incident-local-queue-service.js' });
    vm.runInContext(read('src/boot/incident-queue-coordination-service.js'), context, { filename: 'incident-queue-coordination-service.js' });
    const coordinator = context.FoxBearIncidentQueueCoordination.createCoordinator({
        key: 'incident-test:queue',
        tabId,
        storage,
        navigator: context.navigator,
        BroadcastChannel: FakeBroadcastChannel,
        AbortController,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        leaseSettleMs: 0,
        leaseTtlMs: 1200,
        maxItems: 8,
        maxSerializedBytes: 8192
    });
    return { context, coordinator };
}

function payload(index, tab = 'a', extra = {}) {
    return {
        fingerprint: extra.fingerprint || `${tab}-${index}`,
        clientAt: extra.clientAt || new Date(Date.UTC(2026, 6, 28, 8, 0, 0, index)).toISOString(),
        message: `message-${tab}-${index}`,
        automatic: true,
        ...extra
    };
}

async function main() {
    const pkg = JSON.parse(read('package.json'));
    assert.strictEqual(pkg.version, '1.6.66');
    assert(pkg.foxbearRelease && typeof pkg.foxbearRelease.buildId === 'string' && pkg.foxbearRelease.buildId.length > 0);
    assert(pkg.qaChecks.includes('node --check src/boot/incident-queue-coordination-service.js'));
    assert(pkg.qaChecks.includes('node qa/v1627_incident_multitab_queue_ownership_stress_smoke.js'));

    const storage = new SharedStorage();
    const tabA = createTab(storage, 'tab-a');
    const tabB = createTab(storage, 'tab-b');
    assert.strictEqual(tabA.context.FoxBearIncidentQueueCoordination.version, '1.6.66');

    let peerSyncEvents = 0;
    tabB.coordinator.subscribe(detail => { if (detail.source === 'peer') peerSyncEvents += 1; });
    tabA.coordinator.enqueue(payload(1, 'a'));
    tabB.coordinator.enqueue(payload(1, 'b'));
    assert.deepStrictEqual(Array.from(tabA.coordinator.load(), item => item.fingerprint), ['a-1', 'b-1']);
    assert.deepStrictEqual(Array.from(tabB.coordinator.load(), item => item.fingerprint), ['a-1', 'b-1']);
    assert(peerSyncEvents >= 1, 'BroadcastChannel changes must notify peer tabs');

    const sameFingerprintAt = new Date(Date.UTC(2026, 6, 28, 8, 0, 0, 9)).toISOString();
    const duplicateA = tabA.coordinator.enqueue(payload(9, 'a', { fingerprint: 'same', clientAt: sameFingerprintAt }));
    const duplicateB = tabB.coordinator.enqueue(payload(9, 'b', { fingerprint: 'same', clientAt: sameFingerprintAt }));
    assert.strictEqual(duplicateA.added, true);
    assert.strictEqual(duplicateB.duplicate, true);
    assert.strictEqual(tabA.coordinator.load().filter(item => item.fingerprint === 'same').length, 1);

    for (let index = 10; index < 70; index += 1) {
        const coordinator = index % 2 ? tabA.coordinator : tabB.coordinator;
        coordinator.enqueue(payload(index, index % 2 ? 'a' : 'b'));
    }
    const bounded = tabA.coordinator.load();
    assert.strictEqual(bounded.length, 8, 'merged multi-tab queue must remain globally bounded');
    assert.deepStrictEqual(Array.from(bounded, item => Number(item.clientAt.slice(20, 23))), [62, 63, 64, 65, 66, 67, 68, 69]);
    assert(tabA.coordinator.getState().peerShardCount >= 1);
    assert(tabA.coordinator.getState().shardCount <= 2);

    tabA.coordinator.clear();
    tabA.coordinator.enqueue(payload(80, 'a'));
    tabB.coordinator.enqueue(payload(81, 'b'));
    const flushSnapshot = tabA.coordinator.snapshot();
    tabB.coordinator.enqueue(payload(82, 'b', { concurrent: true }));
    const committed = tabA.coordinator.removeEntries(flushSnapshot.items);
    assert.strictEqual(committed.ok, true);
    assert.strictEqual(committed.count, 1);
    assert.deepStrictEqual(Array.from(tabA.coordinator.load(), item => item.fingerprint), ['b-82'], 'reports queued after a flush snapshot must survive its commit');

    tabA.coordinator.clear();
    const firstSame = payload(90, 'a', { fingerprint: 'repeat', clientAt: '2026-07-28T08:00:00.090Z' });
    const laterSame = payload(91, 'a', { fingerprint: 'repeat', clientAt: '2026-07-28T08:30:00.091Z' });
    tabA.coordinator.enqueue(firstSame);
    tabA.coordinator.removeEntries([firstSame]);
    const laterResult = tabB.coordinator.enqueue(laterSame);
    assert.strictEqual(laterResult.added, true, 'delivery tombstones must identify an exact queued occurrence, not suppress future reports forever');
    assert.deepStrictEqual(Array.from(tabA.coordinator.load(), item => item.clientAt), [laterSame.clientAt]);

    tabA.coordinator.clear();
    tabA.coordinator.enqueue(payload(100, 'a'));
    let activeOwners = 0;
    let maxActiveOwners = 0;
    const firstOwnership = tabA.coordinator.runExclusive(async owner => {
        activeOwners += 1;
        maxActiveOwners = Math.max(maxActiveOwners, activeOwners);
        assert.strictEqual(owner.isOwner(), true);
        await delay(80);
        activeOwners -= 1;
        return 'tab-a-done';
    });
    await delay(5);
    const contenders = await Promise.all(Array.from({ length: 50 }, () => tabB.coordinator.runExclusive(async () => {
        activeOwners += 1;
        maxActiveOwners = Math.max(maxActiveOwners, activeOwners);
        activeOwners -= 1;
        return 'unexpected';
    })));
    const ownerResult = await firstOwnership;
    assert.strictEqual(ownerResult.acquired, true);
    assert.strictEqual(ownerResult.value, 'tab-a-done');
    assert.strictEqual(contenders.filter(result => result.acquired).length, 0, 'peer tab must not acquire while another tab owns queue recovery');
    assert.strictEqual(contenders.filter(result => result.reason === 'peer-owner').length, 50);
    assert.strictEqual(maxActiveOwners, 1, 'single-flush ownership must prevent parallel delivery');
    assert(tabB.coordinator.getState().lockContentions >= 50);

    const nextOwner = await tabB.coordinator.runExclusive(async owner => ({ owned: owner.isOwner(), mode: owner.mode }));
    assert.strictEqual(nextOwner.acquired, true, 'ownership must become available immediately after the prior flush releases it');
    assert.strictEqual(nextOwner.value.owned, true);
    assert(['lease', 'web-lock'].includes(nextOwner.value.mode));

    const legacyStorage = new SharedStorage({
        'incident-test:queue': JSON.stringify([payload(110, 'legacy')])
    });
    const legacyTab = createTab(legacyStorage, 'tab-legacy');
    assert.deepStrictEqual(Array.from(legacyTab.coordinator.load(), item => item.fingerprint), ['legacy-110']);
    legacyTab.coordinator.removeEntries(legacyTab.coordinator.load());
    assert.strictEqual(legacyTab.coordinator.count(), 0, 'legacy single-key queues must migrate through the coordinated flush path');

    const html = read('index.html');
    const sw = read('sw.js');
    const reporter = read('src/boot/incident-reporter.js');
    const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
    const localIndex = html.indexOf('src/boot/incident-local-queue-service.js');
    const coordinationIndex = html.indexOf('src/boot/incident-queue-coordination-service.js');
    const reporterIndex = html.indexOf('src/boot/incident-reporter.js');
    assert(localIndex >= 0 && localIndex < coordinationIndex && coordinationIndex < reporterIndex);
    assert(sw.includes(`./src/boot/incident-queue-coordination-service.js?v=${pkg.foxbearRelease.assetVersion}`));
    assert(reporter.includes('queueCoordinationService.createCoordinator({ key: QUEUE_KEY'));
    assert(reporter.includes('incidentQueue.runExclusive(async owner =>'));
    assert(reporter.includes('incidentQueue.removeEntries(deliveredEntries)'));
    assert(reporter.includes("emitIncidentStatusChange('queue-peer-sync')"));
    assert(handoff.requiredRuntimeAssets.includes('src/boot/incident-queue-coordination-service.js'));
    assert(handoff.requiredFiles.includes('docs/V1.6.27_INCIDENT_MULTITAB_QUEUE_OWNERSHIP_SAFETY.md'));

    tabA.coordinator.dispose();
    tabB.coordinator.dispose();
    legacyTab.coordinator.dispose();
    assert.strictEqual(FakeBroadcastChannel.channels.size, 0);

    console.log('v1.6.27 cross-tab queue shards, exact commit tombstones, and single-flush ownership stress smoke passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
