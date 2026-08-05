'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));

function load(relative, context) {
    vm.runInNewContext(read(relative), context, { filename: relative });
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

async function main() {
    assert.strictEqual(pkg.version, '1.6.59');
    assert(pkg.qaChecks.includes('node qa/v1624_incident_recovery_sweep_observability_smoke.js'));
    assert(pkg.foxbearRelease.assetVersion.startsWith(`${pkg.version}-`));

    let now = Date.UTC(2026, 6, 28, 7, 0, 0);
    const context = { Date, Promise, Object, String, Number, Array, Set, Math, console, navigator: { onLine: true }, globalThis: null };
    context.globalThis = context;
    load('src/boot/incident-recovery-sweep-service.js', context);
    const service = context.FoxBearIncidentRecoverySweep;
    assert.strictEqual(service.version, '1.6.59');

    const firstQueue = deferred();
    const phaseRequests = [];
    const results = [];
    let queueCalls = 0;
    let historyCalls = 0;
    let serviceCalls = 0;
    let deploymentCalls = 0;
    const controller = service.createController({
        now: () => now,
        isOnline: () => true,
        flushQueue: request => {
            queueCalls += 1;
            phaseRequests.push({ phase: 'queue', request });
            return queueCalls === 1 ? firstQueue.promise : { delivered: 2, remaining: 1 };
        },
        syncHistory: request => {
            historyCalls += 1;
            phaseRequests.push({ phase: 'history', request });
            return [{ reportId: `r-${historyCalls}` }];
        },
        shouldRefreshService: request => request.forceService === true,
        refreshService: request => { serviceCalls += 1; phaseRequests.push({ phase: 'service', request }); return { ok: true }; },
        shouldCheckDeployment: request => request.checkDeployment === true,
        checkDeployment: request => { deploymentCalls += 1; phaseRequests.push({ phase: 'deployment', request }); return { ok: true }; },
        getQueueLength: () => 7,
        getHistoryCount: () => 3,
        onResult: result => results.push(result)
    });

    const running = controller.run({ reason: 'online' });
    const mergedA = controller.run({ reason: 'long-resume', forceService: true });
    const mergedB = controller.run({ reason: 'network-change', checkDeployment: true });
    assert.strictEqual(mergedA, running, 'coalesced callers must share the active promise');
    assert.strictEqual(mergedB, running, 'all pending callers must share the active promise');
    assert.deepStrictEqual(Array.from(controller.getState().pendingReasons), ['long-resume', 'network-change']);

    firstQueue.resolve({ delivered: 1, remaining: 2 });
    now += 250;
    const finalResult = await running;
    assert.strictEqual(queueCalls, 2);
    assert.strictEqual(historyCalls, 2);
    assert.strictEqual(serviceCalls, 1, 'service refresh should run for the merged forced request only');
    assert.strictEqual(deploymentCalls, 1, 'deployment check should run for the merged deployment request only');
    assert.deepStrictEqual(Array.from(finalResult.mergedReasons), ['long-resume', 'network-change']);
    assert.strictEqual(finalResult.reason, 'long-resume+network-change');
    assert.strictEqual(finalResult.queueRemaining, 1);
    assert.strictEqual(finalResult.readinessOk, true);
    assert.strictEqual(results.length, 2, 'each executed cycle must publish a result snapshot');
    assert.strictEqual(controller.getState().runCount, 2);
    assert.strictEqual(controller.getState().inFlight, false);

    let offlineCallbacks = 0;
    const offlineResults = [];
    const offlineController = service.createController({
        now: () => now,
        isOnline: () => false,
        flushQueue: () => { offlineCallbacks += 1; },
        syncHistory: () => { offlineCallbacks += 1; },
        getQueueLength: () => 4,
        getHistoryCount: () => 5,
        onResult: result => offlineResults.push(result)
    });
    const offlineResult = await offlineController.run({ reason: 'offline-resume', forceService: true, checkDeployment: true });
    assert.strictEqual(offlineCallbacks, 0, 'offline sweep must not invoke network phases');
    assert.strictEqual(offlineResult.ok, false);
    assert.strictEqual(offlineResult.offline, true);
    assert.strictEqual(offlineResult.queueRemaining, 4);
    assert.strictEqual(offlineResult.historyCount, 5);
    assert.strictEqual(offlineResults.length, 1, 'offline attempts must still publish diagnostics');
    assert.strictEqual(offlineController.getState().lastResult.offline, true);

    let fallbackServiceCalls = 0;
    let fallbackDeploymentCalls = 0;
    const fallbackController = service.createController({
        isOnline: () => true,
        flushQueue: () => ({ delivered: 0, remaining: 0 }),
        syncHistory: () => [],
        refreshService: () => { fallbackServiceCalls += 1; return { ok: true }; },
        checkDeployment: () => { fallbackDeploymentCalls += 1; return { ok: true }; }
    });
    const fallbackResult = await fallbackController.run({ reason: 'fallback-decisions', forceService: true, checkDeployment: true });
    assert.strictEqual(fallbackServiceCalls, 1, 'request forceService must work when no predicate is supplied');
    assert.strictEqual(fallbackDeploymentCalls, 1, 'request checkDeployment must work when no predicate is supplied');
    assert.strictEqual(fallbackResult.ok, true);

    const phaseErrors = [];
    const failingController = service.createController({
        isOnline: () => true,
        flushQueue: () => { throw Object.assign(new Error('temporary'), { code: 'TEMP_FAIL' }); },
        syncHistory: () => { throw Object.assign(new Error('duplicate'), { code: 'TEMP_FAIL' }); },
        onError: detail => phaseErrors.push(detail)
    });
    const failed = await failingController.run({ reason: 'error-test' });
    assert.strictEqual(failed.ok, false);
    assert.deepStrictEqual(Array.from(failed.errors), ['TEMP_FAIL'], 'duplicate phase failures should be bounded and deduplicated');
    assert.strictEqual(phaseErrors.length, 2, 'phase-level observability must preserve both failing phases');

    const countFailureController = service.createController({
        isOnline: () => true,
        getQueueLength: () => { throw Object.assign(new Error('count failed'), { code: 'COUNT_FAIL' }); },
        getHistoryCount: () => 2
    });
    const countFailure = await countFailureController.run({ reason: 'count-failure' });
    assert.strictEqual(countFailure.ok, false, 'count callback failures must affect the final result');
    assert.deepStrictEqual(Array.from(countFailure.errors), ['COUNT_FAIL']);
    assert.strictEqual(countFailure.queueRemaining, 0);

    failingController.dispose();
    const disposed = await failingController.run({ reason: 'after-dispose' });
    assert.strictEqual(disposed.disposed, true);
    assert.deepStrictEqual(Array.from(disposed.errors), ['recovery-sweep-disposed']);

    const reporter = read('src/boot/incident-reporter.js');
    const html = read('index.html');
    const sw = read('sw.js');
    const handoffPackage = JSON.parse(read('HANDOFF_PACKAGE.json'));
    const sweepIndex = html.indexOf('src/boot/incident-recovery-sweep-service.js');
    const reporterIndex = html.indexOf('src/boot/incident-reporter.js');
    assert(sweepIndex >= 0 && sweepIndex < reporterIndex, 'recovery sweep service must load before the reporter');
    assert(sw.includes(`./src/boot/incident-recovery-sweep-service.js?v=${pkg.foxbearRelease.assetVersion}`));
    assert(reporter.includes('recoverySweepController.getState()'));
    assert(reporter.includes('lastSweepOffline'));
    assert(reporter.includes('lastLifecycleError'));
    assert(reporter.includes('onError: detail => recordLifecycleCallbackError(detail)'));
    assert(handoffPackage.requiredRuntimeAssets.includes('src/boot/incident-recovery-sweep-service.js'));
    assert(handoffPackage.requiredFiles.includes('qa/v1624_incident_recovery_sweep_observability_smoke.js'));
    assert(handoffPackage.requiredFiles.includes('docs/V1.6.24_INCIDENT_RECOVERY_SWEEP_OBSERVABILITY.md'));

    console.log('v1.6.24 incident recovery sweep module split, offline snapshot, and lifecycle observability smoke passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
