#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function createContext(initial = {}) {
    const values = new Map(Object.entries(initial));
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
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
        TextEncoder,
        encodeURIComponent,
        unescape,
        localStorage
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(read('src/boot/incident-support-service.js'), context, { filename: 'incident-support-service.js' });
    vm.runInContext(read('src/boot/incident-local-queue-service.js'), context, { filename: 'incident-local-queue-service.js' });
    vm.runInContext(read('src/boot/incident-service-diagnostics.js'), context, { filename: 'incident-service-diagnostics.js' });
    return { context, values };
}

function payload(index, extra = {}) {
    return { fingerprint: `f-${index}`, message: `message-${index}`, stack: 'x'.repeat(120), ...extra };
}

function main() {
    const pkg = JSON.parse(read('package.json'));
    assert(Number(pkg.version.split('.').join('')) >= 1626);
    assert(pkg.qaChecks.includes('node qa/v1626_incident_diagnostics_queue_conflict_safety_smoke.js'));
    assert(pkg.qaChecks.includes('node --check src/boot/incident-local-queue-service.js'));

    const { context } = createContext();
    const queueModule = context.FoxBearIncidentLocalQueue;
    const diagnostics = context.FoxBearIncidentServiceDiagnostics;
    assert(Number(queueModule.version.split('.').join('')) >= 1626);
    assert(Number(diagnostics.version.split('.').join('')) >= 1626);

    const bounded = queueModule.createStore({ key: 'bounded', maxItems: 8, maxSerializedBytes: 4096 });
    for (let index = 0; index < 50; index += 1) bounded.enqueue(payload(index));
    const boundedItems = bounded.load();
    assert.strictEqual(boundedItems.length, 8, 'queue must remain bounded during trigger storms');
    assert.deepStrictEqual(Array.from(boundedItems, item => item.fingerprint), ['f-42', 'f-43', 'f-44', 'f-45', 'f-46', 'f-47', 'f-48', 'f-49']);
    const duplicate = bounded.enqueue(payload(49));
    assert.strictEqual(duplicate.duplicate, true);
    assert.strictEqual(duplicate.count, 8);
    assert.strictEqual(bounded.getState().lastStoredCount, 8);
    assert(bounded.getState().lastSerializedBytes <= 4096);

    const conflictSafe = queueModule.createStore({ key: 'conflict', maxItems: 8 });
    for (let index = 0; index < 4; index += 1) conflictSafe.enqueue(payload(index));
    const snapshot = conflictSafe.snapshot();
    conflictSafe.enqueue(payload(4, { concurrent: true }));
    const committed = conflictSafe.removeFingerprints(snapshot.items.slice(0, 2).map(item => item.fingerprint));
    assert.strictEqual(committed.removed, 2);
    assert.deepStrictEqual(Array.from(conflictSafe.load(), item => item.fingerprint), ['f-2', 'f-3', 'f-4'], 'flush commit must preserve reports queued after the snapshot');
    assert.strictEqual(conflictSafe.getState().conflictSafeCommits, 1);

    let quotaRaw = '[]';
    const quotaStore = queueModule.createStore({
        key: 'quota',
        maxItems: 8,
        storageGet: () => quotaRaw,
        storageSet: (_key, raw) => {
            if (JSON.parse(raw).length > 2) return false;
            quotaRaw = raw;
            return true;
        }
    });
    const quotaResult = quotaStore.save([0, 1, 2, 3, 4].map(payload));
    assert.strictEqual(quotaResult.ok, true);
    assert.strictEqual(quotaResult.count, 2, 'quota fallback should keep the newest bounded entries');
    assert.deepStrictEqual(JSON.parse(quotaRaw).map(item => item.fingerprint), ['f-3', 'f-4']);
    assert(quotaStore.getState().storageFailures >= 3);

    const malformed = createContext({ malformed: '{broken-json' }).context.FoxBearIncidentLocalQueue.createStore({ key: 'malformed' });
    assert.deepStrictEqual(Array.from(malformed.load()), []);
    assert.strictEqual(malformed.getState().parseErrors, 1);

    const oversizedRaw = JSON.stringify([{ fingerprint: 'huge', message: 'x'.repeat(50000) }]);
    const oversized = createContext({ oversized: oversizedRaw }).context.FoxBearIncidentLocalQueue.createStore({ key: 'oversized', maxSerializedBytes: 4096 });
    assert.deepStrictEqual(Array.from(oversized.load()), []);
    assert.strictEqual(oversized.getState().oversizeLoads, 1);

    assert.strictEqual(diagnostics.classifyFailure({ online: false, originalCode: 'functions/internal' }).code, 'FOXBEAR_INCIDENT_CLIENT_OFFLINE');
    assert.strictEqual(diagnostics.classifyFailure({ online: true, originalCode: 'functions/not-found' }).code, 'functions/not-found');
    assert.strictEqual(diagnostics.classifyFailure({ online: true, csp: { ok: false } }).code, 'FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED');
    assert.strictEqual(diagnostics.classifyFailure({ online: true, probe: { reachable: true, corsReadable: false } }).code, 'FOXBEAR_INCIDENT_CALLABLE_RESPONSE_BLOCKED');
    assert.strictEqual(diagnostics.classifyFailure({ online: true, originalCode: 'functions/internal', probe: { reachable: true, corsReadable: true } }).code, 'functions/internal');

    const readyModel = diagnostics.buildViewModel({
        service: {
            status: 'ready', productVersion: ['1', '6', '25'].join('.'), region: 'asia-northeast3', functionsOrigin: 'https://example.test',
            transport: 'hosting-rewrite', appCheckEnforced: true, appCheckTokenPresent: false
        },
        bridge: { incidentStatusFunctionName: 'getIncidentServiceStatus', incidentSameOriginStatusPath: '/api/incident/status' },
        clientVersion: pkg.version,
        csp: { ok: true },
        classifyFailure: () => ''
    });
    assert.strictEqual(readyModel.server.tone, 'warning');
    assert(readyModel.server.text.includes('업데이트 필요'));
    assert.strictEqual(readyModel.sameOriginStatus.tone, 'ok');
    assert.strictEqual(readyModel.appCheckStatus.tone, 'error');
    assert.strictEqual(readyModel.endpoint, 'https://example.test/getIncidentServiceStatus');

    const errorModel = diagnostics.buildViewModel({
        errorCode: 'FOXBEAR_INCIDENT_CALLABLE_RESPONSE_BLOCKED',
        errorMessage: 'blocked',
        bridge: {},
        csp: { ok: true },
        classifyFailure: () => 'server-response-blocked'
    });
    assert.strictEqual(errorModel.server.tone, 'error');
    assert(errorModel.server.text.includes('응답 읽기'));

    const html = read('index.html');
    const sw = read('sw.js');
    const reporter = read('src/boot/incident-reporter.js');
    const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
    const supportIndex = html.indexOf('src/boot/incident-support-service.js');
    const queueIndex = html.indexOf('src/boot/incident-local-queue-service.js');
    const coordinationIndex = html.indexOf('src/boot/incident-queue-coordination-service.js');
    const diagnosticsIndex = html.indexOf('src/boot/incident-service-diagnostics.js');
    const reporterIndex = html.indexOf('src/boot/incident-reporter.js');
    assert(supportIndex >= 0 && supportIndex < queueIndex && queueIndex < coordinationIndex && coordinationIndex < diagnosticsIndex && diagnosticsIndex < reporterIndex);
    assert(sw.includes(`./src/boot/incident-local-queue-service.js?v=${pkg.foxbearRelease.assetVersion}`));
    assert(sw.includes(`./src/boot/incident-service-diagnostics.js?v=${pkg.foxbearRelease.assetVersion}`));
    assert(reporter.includes('const snapshot = incidentQueue.snapshot();'));
    assert(reporter.includes('incidentQueue.removeEntries(deliveredEntries)'));
    assert(reporter.includes('incidentQueue.runExclusive(async owner =>'));
    assert(reporter.includes('serviceDiagnostics.classifyFailure({'));
    assert(reporter.includes('serviceDiagnostics.buildViewModel({'));
    assert(!reporter.includes('remaining.push(...queue.slice(index))'), 'stale snapshot overwrite path must be removed');
    assert(handoff.requiredRuntimeAssets.includes('src/boot/incident-local-queue-service.js'));
    assert(handoff.requiredRuntimeAssets.includes('src/boot/incident-service-diagnostics.js'));
    assert(handoff.requiredFiles.includes('docs/V1.6.26_INCIDENT_DIAGNOSTICS_QUEUE_CONFLICT_SAFETY.md'));

    console.log('v1.6.26 incident diagnostics module split and conflict-safe bounded local queue smoke passed');
}

main();
