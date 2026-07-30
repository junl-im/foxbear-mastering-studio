'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));

function createClock(start = Date.UTC(2026, 6, 28, 8, 0, 0)) {
    let now = start;
    let nextId = 1;
    const timers = new Map();
    const setTimeout = (callback, delay = 0) => {
        const id = nextId++;
        timers.set(id, { at: now + Math.max(0, Number(delay) || 0), callback });
        return id;
    };
    const clearTimeout = id => timers.delete(id);
    async function flushMicrotasks(rounds = 8) {
        for (let index = 0; index < rounds; index += 1) await Promise.resolve();
    }
    async function advance(ms) {
        const target = now + Math.max(0, Number(ms) || 0);
        while (true) {
            const due = [...timers.entries()]
                .filter(([, timer]) => timer.at <= target)
                .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
            if (!due) break;
            const [id, timer] = due;
            timers.delete(id);
            now = timer.at;
            timer.callback();
            await flushMicrotasks();
        }
        now = target;
        await flushMicrotasks();
    }
    return { now: () => now, setTimeout, clearTimeout, advance, count: () => timers.size };
}

function loadController(extra = {}) {
    const context = {
        Date,
        Promise,
        Object,
        String,
        Number,
        Array,
        Set,
        Math,
        Error,
        AbortController,
        console,
        navigator: { onLine: true },
        ...extra
    };
    context.globalThis = context;
    vm.runInNewContext(read('src/boot/incident-service-recovery-controller.js'), context, { filename: 'incident-service-recovery-controller.js' });
    return context.FoxBearIncidentServiceRecovery;
}

async function main() {
    assert.strictEqual(pkg.version, '1.6.42');
    assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId));
    assert(pkg.qaChecks.includes('node qa/v1625_incident_recovery_timeout_abort_stress_smoke.js'));

    const service = loadController();
    assert.strictEqual(service.version, '1.6.42');
    assert.deepStrictEqual(Array.from(service.defaultDelaysMs), [5000, 15000, 45000]);
    assert.strictEqual(service.defaultPhaseTimeoutsMs.service, 22000);

    const clock = createClock();
    const phaseSignals = [];
    const progress = [];
    const results = [];
    const successful = service.createController({
        now: clock.now,
        setTimeout: clock.setTimeout,
        clearTimeout: clock.clearTimeout,
        phaseTimeoutsMs: { service: 50, queue: 50, deployment: 50 },
        slowPhaseMs: 5,
        isOnline: () => true,
        shouldRun: () => true,
        refreshService: async context => {
            phaseSignals.push(context.signal);
            await clock.advance(6);
            return { ok: true };
        },
        flushQueue: async context => {
            phaseSignals.push(context.signal);
            await clock.advance(2);
            return { delivered: 2, remaining: 1 };
        },
        checkDeployment: async context => {
            phaseSignals.push(context.signal);
            await clock.advance(7);
            return { ok: true };
        },
        onProgress: item => progress.push(item),
        onResult: item => results.push(item)
    });
    const success = await successful.run({ manual: true, checkDeployment: true });
    assert.strictEqual(success.ok, true);
    assert.strictEqual(success.queueDelivered, 2);
    assert.strictEqual(success.queueRemaining, 1);
    assert.deepStrictEqual(Array.from(success.slowPhases), ['service', 'deployment']);
    assert.strictEqual(phaseSignals.length, 3);
    assert(phaseSignals.every(signal => signal && signal.aborted === false));
    assert.strictEqual(results.length, 1);
    assert(progress.some(item => item.phase === 'complete' && item.state === 'ok'));

    const retryClock = createClock();
    let retryCalls = 0;
    const retryErrors = [];
    const retryController = service.createController({
        now: retryClock.now,
        setTimeout: retryClock.setTimeout,
        clearTimeout: retryClock.clearTimeout,
        delaysMs: [5, 10],
        phaseTimeoutsMs: { service: 10, queue: 20, deployment: 20 },
        isOnline: () => true,
        shouldRun: () => true,
        classifyFailure: code => /_TIMEOUT$/.test(code) ? 'server-api-unavailable' : code,
        refreshService: () => {
            retryCalls += 1;
            return new Promise(() => {});
        },
        flushQueue: () => ({ delivered: 0, remaining: 0 }),
        getQueueLength: () => 3,
        onError: detail => retryErrors.push(detail)
    });
    const firstRun = retryController.run({ automatic: true, checkDeployment: false });
    await retryClock.advance(10);
    await assert.rejects(firstRun, error => error.code === 'FOXBEAR_INCIDENT_RECOVERY_SERVICE_TIMEOUT');
    let retryState = retryController.getState();
    assert.strictEqual(retryState.inFlight, false);
    assert.strictEqual(retryState.scheduled, true, 'retry must be scheduled after in-flight cleanup');
    assert.strictEqual(retryState.attempt, 1);
    assert.strictEqual(retryState.nextAt, retryClock.now() + 5);
    assert.strictEqual(retryState.timeoutCount, 1);
    assert.strictEqual(retryState.lastResult.timedOutPhase, 'service');
    assert.strictEqual(retryState.lastResult.queueRemaining, 3);

    await retryClock.advance(5);
    assert.strictEqual(retryCalls, 2, 'scheduled retry should start a second service attempt');
    assert.strictEqual(retryController.getState().inFlight, true);
    await retryClock.advance(10);
    retryState = retryController.getState();
    assert.strictEqual(retryState.inFlight, false);
    assert.strictEqual(retryState.scheduled, true);
    assert.strictEqual(retryState.attempt, 2);
    assert.strictEqual(retryState.timeoutCount, 2);
    assert(retryErrors.some(item => item.phase === 'service-timeout'));

    const offlineClock = createClock();
    let online = false;
    let offlineRuns = 0;
    const offlineController = service.createController({
        now: offlineClock.now,
        setTimeout: offlineClock.setTimeout,
        clearTimeout: offlineClock.clearTimeout,
        delaysMs: [5, 10],
        isOnline: () => online,
        shouldRun: () => true,
        refreshService: () => { offlineRuns += 1; return { ok: true }; },
        flushQueue: () => ({ delivered: 0, remaining: 0 })
    });
    assert.strictEqual(offlineController.schedule('client-offline', 'offline'), true);
    assert.strictEqual(offlineController.getState().waitingForOnline, true);
    assert.strictEqual(offlineController.getState().attempt, 0, 'offline waiting must not consume retry attempts');
    assert.strictEqual(offlineClock.count(), 0, 'offline waiting must not create wake-up timers');
    online = true;
    const resumed = offlineController.resumeOnline({ checkDeployment: false });
    assert(resumed && typeof resumed.then === 'function');
    await resumed;
    assert.strictEqual(offlineRuns, 1);
    assert.strictEqual(offlineController.getState().waitingForOnline, false);

    const hiddenClock = createClock();
    let visible = false;
    let hiddenRuns = 0;
    const hiddenController = service.createController({
        now: hiddenClock.now,
        setTimeout: hiddenClock.setTimeout,
        clearTimeout: hiddenClock.clearTimeout,
        delaysMs: [5],
        isOnline: () => true,
        shouldRun: () => visible,
        refreshService: () => { hiddenRuns += 1; return { ok: true }; },
        flushQueue: () => ({ delivered: 0, remaining: 0 })
    });
    assert.strictEqual(hiddenController.schedule('server-api-unavailable', 'hidden'), true);
    await hiddenClock.advance(5);
    assert.strictEqual(hiddenRuns, 0);
    assert.strictEqual(hiddenController.getState().suspended, true);
    assert.strictEqual(hiddenController.getState().attempt, 0, 'hidden surface must not burn retry budget');

    const stormClock = createClock();
    let stormResolve;
    let stormCalls = 0;
    const stormController = service.createController({
        now: stormClock.now,
        setTimeout: stormClock.setTimeout,
        clearTimeout: stormClock.clearTimeout,
        delaysMs: [5],
        isOnline: () => true,
        shouldRun: () => true,
        refreshService: () => {
            stormCalls += 1;
            return new Promise(resolve => { stormResolve = resolve; });
        },
        flushQueue: () => ({ delivered: 0, remaining: 0 })
    });
    const active = stormController.run({ checkDeployment: false });
    const shared = Array.from({ length: 50 }, () => stormController.run({ checkDeployment: false }));
    assert(shared.every(item => item === active), 'repeated network-triggered runs must share one in-flight promise');
    assert.strictEqual(stormCalls, 0);
    await Promise.resolve();
    assert.strictEqual(stormCalls, 1);
    stormResolve({ ok: true });
    await active;
    for (let index = 0; index < 50; index += 1) stormController.schedule('server-api-unavailable', `storm-${index}`);
    assert.strictEqual(stormController.getState().scheduleCount, 1, 'repeated schedule requests must produce one timer');
    assert.strictEqual(stormClock.count(), 1);

    const abortClock = createClock();
    let observedSignal = null;
    const abortController = service.createController({
        now: abortClock.now,
        setTimeout: abortClock.setTimeout,
        clearTimeout: abortClock.clearTimeout,
        phaseTimeoutsMs: { service: 1000, queue: 1000, deployment: 1000 },
        isOnline: () => true,
        refreshService: context => {
            observedSignal = context.signal;
            return new Promise(() => {});
        },
        flushQueue: () => ({ delivered: 0, remaining: 0 })
    });
    const abortedRun = abortController.run({ schedule: false, checkDeployment: false });
    await Promise.resolve();
    abortController.dispose();
    await assert.rejects(abortedRun, error => error.name === 'AbortError' || error.code === 'FOXBEAR_INCIDENT_RECOVERY_ABORTED');
    assert.strictEqual(observedSignal.aborted, true);
    assert.strictEqual(abortController.getState().abortCount, 1);
    assert.strictEqual(abortController.getState().scheduled, false);

    const html = read('index.html');
    const sw = read('sw.js');
    const reporter = read('src/boot/incident-reporter.js');
    const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
    const controllerIndex = html.indexOf('src/boot/incident-service-recovery-controller.js');
    const reporterIndex = html.indexOf('src/boot/incident-reporter.js');
    assert(controllerIndex >= 0 && controllerIndex < reporterIndex, 'service recovery controller must load before reporter');
    assert(sw.includes(`./src/boot/incident-service-recovery-controller.js?v=${pkg.foxbearRelease.assetVersion}`));
    assert(reporter.includes("refreshServiceStatus({ force: true, skipRecoverySchedule: true, signal: context.signal })"));
    assert(reporter.includes("flushQueue({ signal: context.signal })"));
    assert(reporter.includes("runDeploymentSelfCheck({ signal: context.signal })"));
    assert(reporter.includes("if (isAbortError(error)) throw error;"));
    assert(!reporter.includes('state.serviceRecoveryTimer'), 'timer ownership must leave the reporter');
    assert(handoff.requiredRuntimeAssets.includes('src/boot/incident-service-recovery-controller.js'));
    assert(handoff.requiredFiles.includes('qa/v1625_incident_recovery_timeout_abort_stress_smoke.js'));
    assert(handoff.requiredFiles.includes('docs/V1.6.25_INCIDENT_RECOVERY_TIMEOUT_ABORT_STRESS.md'));

    console.log('v1.6.25 incident recovery timeout, abort, deferred retry, offline pause, and trigger-storm smoke passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
