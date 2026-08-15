'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const STORAGE_KEY = 'foxbear-incident-reporter-v1:route-health';

function load(relative, context) {
    vm.runInNewContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative });
}

function nextTurn() {
    return new Promise(resolve => setImmediate(resolve));
}

async function main() {
    assert.strictEqual(pkg.version, '1.6.102');
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build ID is invalid');
    assert(pkg.qaChecks.includes('node qa/v1623_route_decay_lifecycle_handoff_safety_smoke.js'));

    const store = new Map();
    let now = Date.UTC(2026, 0, 1, 0, 0, 0);
    let effectiveType = '4g';
    class FakeDate extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const routeContext = {
        Date: FakeDate, console, JSON, Math, Object, String, Number, Array, Boolean,
        navigator: { onLine: true, connection: { type: 'wifi', get effectiveType() { return effectiveType; }, saveData: false } },
        localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
        globalThis: null
    };
    routeContext.globalThis = routeContext;
    load('src/boot/incident-route-policy.js', routeContext);
    const policy = routeContext.FoxBearIncidentRoutePolicy;
    assert.strictEqual(policy.version, '1.6.102');

    for (let index = 0; index < 20; index += 1) policy.recordSuccess('callable', now);
    assert.strictEqual(policy.getHealth(now).routes.callable.successes, 20);

    now += 3 * 24 * 60 * 60 * 1000;
    const decayed = policy.getHealth(now);
    assert(decayed.routes.callable.successes < 20, 'aged route evidence should decay');
    const persistedAfterRead = JSON.parse(store.get(STORAGE_KEY));
    assert.strictEqual(persistedAfterRead.routes.callable.successes, decayed.routes.callable.successes, 'decay must be persisted after a health read');
    assert.strictEqual(persistedAfterRead.lastDecayAt, new Date(now).toISOString());

    const afterSuccess = policy.recordSuccess('callable', now);
    assert.strictEqual(afterSuccess.routes.callable.successes, decayed.routes.callable.successes + 1, 'new success must increment decayed evidence rather than stale evidence');
    assert.strictEqual(JSON.parse(store.get(STORAGE_KEY)).routes.callable.successes, afterSuccess.routes.callable.successes);

    now += 24 * 60 * 60 * 1000;
    const expectedTimeDecay = Math.floor(afterSuccess.routes.callable.successes * policy.timeDecayFactor);
    effectiveType = '3g';
    const afterNetworkChange = policy.observeNetworkChange(now);
    assert.strictEqual(afterNetworkChange.routes.callable.successes, Math.floor(expectedTimeDecay * policy.networkDecayFactor), 'time and network decay must both apply in one preparation pass');
    assert.strictEqual(afterNetworkChange.exploration.remaining, policy.explorationAttempts);
    assert.strictEqual(JSON.parse(store.get(STORAGE_KEY)).routes.callable.successes, afterNetworkChange.routes.callable.successes);

    let clock = 1000;
    const windowListeners = {};
    const documentListeners = {};
    const connectionListeners = {};
    const pendingTimers = [];
    const documentRef = {
        visibilityState: 'visible',
        addEventListener(type, handler) { documentListeners[type] = handler; },
        removeEventListener(type, handler) { if (documentListeners[type] === handler) delete documentListeners[type]; }
    };
    const navigatorRef = {
        onLine: true,
        connection: {
            addEventListener(type, handler) { connectionListeners[type] = handler; },
            removeEventListener(type, handler) { if (connectionListeners[type] === handler) delete connectionListeners[type]; }
        }
    };
    const lifecycleContext = {
        Date, console,
        document: documentRef,
        navigator: navigatorRef,
        addEventListener(type, handler) { windowListeners[type] = handler; },
        removeEventListener(type, handler) { if (windowListeners[type] === handler) delete windowListeners[type]; },
        setTimeout(handler, delay) { pendingTimers.push({ handler, delay }); return pendingTimers.length; },
        clearTimeout() {},
        globalThis: null
    };
    lifecycleContext.globalThis = lifecycleContext;
    load('src/boot/incident-lifecycle-service.js', lifecycleContext);

    const lifecycleErrors = [];
    const unhandled = [];
    const captureUnhandled = reason => unhandled.push(reason);
    process.on('unhandledRejection', captureUnhandled);
    try {
        const controller = lifecycleContext.FoxBearIncidentLifecycle.createController({
            global: lifecycleContext,
            document: documentRef,
            navigator: navigatorRef,
            connection: navigatorRef.connection,
            now: () => clock,
            setTimeout: lifecycleContext.setTimeout,
            clearTimeout: lifecycleContext.clearTimeout,
            routePolicy: { currentNetworkKey: () => 'online|wifi|4g|normal-data', observeNetworkChange: () => ({ networkKey: 'online|wifi|4g|normal-data' }) },
            onOnline: async () => { throw Object.assign(new Error('online callback failed'), { code: 'ONLINE_FAIL' }); },
            onLongResume: () => { throw new Error('resume callback failed'); },
            onConnectionChange: async () => { throw new Error('connection callback failed'); },
            onError: detail => lifecycleErrors.push(detail)
        });

        windowListeners.online();
        await nextTurn();
        assert(lifecycleErrors.some(item => item.phase === 'online' && item.code === 'ONLINE_FAIL'));

        documentRef.visibilityState = 'hidden';
        documentListeners.visibilitychange();
        await nextTurn();
        clock += 6 * 60 * 1000;
        documentRef.visibilityState = 'visible';
        documentListeners.visibilitychange();
        await nextTurn();
        assert(lifecycleErrors.some(item => item.phase === 'visibility-change'));

        connectionListeners.change();
        assert.strictEqual(pendingTimers.at(-1).delay, 750);
        pendingTimers.at(-1).handler();
        await nextTurn();
        assert(lifecycleErrors.some(item => item.phase === 'connection-change'));
        assert.strictEqual(unhandled.length, 0, 'bound lifecycle events must not leak unhandled Promise rejections');

        controller.dispose();
        assert.strictEqual(windowListeners.online, undefined);
        assert.strictEqual(documentListeners.visibilitychange, undefined);
        assert.strictEqual(connectionListeners.change, undefined);
    } finally {
        process.removeListener('unhandledRejection', captureUnhandled);
    }

    const handoff = fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8');
    const desktop = fs.readFileSync(path.join(root, 'GITHUB_DESKTOP_HANDOFF.md'), 'utf8');
    const deliveryRules = fs.readFileSync(path.join(root, 'DELIVERY_RULES.md'), 'utf8');
    const verifyHandoff = fs.readFileSync(path.join(root, 'tools/verify-handoff-state.js'), 'utf8');
    assert(handoff.startsWith('# Handoff - v1.6.102'));
    assert(handoff.includes('- Product version: `1.6.102`'));
    assert(handoff.includes(`- Configured static/regression target: ${pkg.qaChecks.length} checks.`));
    assert(desktop.startsWith('# GitHub Desktop Handoff - v1.6.102'));
    for (const heading of ['## 1. 적용 내역', '## 2. 다음 패치 예정', '## 3. 다운로드 파일 2종']) assert(deliveryRules.includes(heading));
    assert(verifyHandoff.includes('DELIVERY_RULES.md'));
    assert(verifyHandoff.includes('handoffCurrentRelease'));

    console.log('v1.6.23 persisted route decay, lifecycle rejection containment, and handoff safety smoke passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
