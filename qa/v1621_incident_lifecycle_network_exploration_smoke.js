'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

function load(relative, context) {
    vm.runInNewContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative });
}

async function main() {
    assert(/^1\.6\.\d+$/.test(pkg.version), 'current product version is invalid');
    assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build ID is invalid');

    const store = new Map();
    let effectiveType = '4g';
    const routeContext = {
        Date, console, JSON, Math, Object, String, Number, Array, Boolean,
        navigator: { onLine: true, connection: { type: 'wifi', saveData: false, get effectiveType() { return effectiveType; } } },
        localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
        globalThis: null
    };
    routeContext.globalThis = routeContext;
    load('src/boot/incident-route-policy.js', routeContext);
    const routePolicy = routeContext.FoxBearIncidentRoutePolicy;
    for (let index = 0; index < 6; index += 1) routePolicy.recordSuccess('callable');
    effectiveType = '3g';
    const changed = routePolicy.observeNetworkChange();
    assert.strictEqual(changed.exploration.active, true, 'network change should start exploration');
    assert.strictEqual(changed.exploration.remaining, 4);
    assert.strictEqual(routePolicy.getPreferredRoutes()[0], 'callable');
    routePolicy.recordAttempt('callable');
    assert.strictEqual(routePolicy.getHealth().exploration.nextRoute, 'hosting-rewrite');
    assert.strictEqual(routePolicy.getPreferredRoutes()[0], 'hosting-rewrite');
    routePolicy.recordAttempt('hosting-rewrite');
    routePolicy.recordAttempt('callable');
    routePolicy.recordAttempt('hosting-rewrite');
    assert.strictEqual(routePolicy.getHealth().exploration.active, false, 'four route attempts should complete exploration');

    let clock = 1000;
    const windowListeners = {};
    const documentListeners = {};
    const connectionListeners = {};
    const pendingTimers = [];
    const documentRef = {
        visibilityState: 'visible',
        addEventListener(type, handler) { documentListeners[type] = handler; },
        removeEventListener(type) { delete documentListeners[type]; }
    };
    const navigatorRef = {
        onLine: true,
        connection: {
            addEventListener(type, handler) { connectionListeners[type] = handler; },
            removeEventListener(type) { delete connectionListeners[type]; }
        }
    };
    const lifecycleContext = {
        Date, console,
        document: documentRef,
        navigator: navigatorRef,
        addEventListener(type, handler) { windowListeners[type] = handler; },
        removeEventListener(type) { delete windowListeners[type]; },
        setTimeout(handler, delay) { pendingTimers.push({ handler, delay }); return pendingTimers.length; },
        clearTimeout() {},
        globalThis: null
    };
    lifecycleContext.globalThis = lifecycleContext;
    load('src/boot/incident-lifecycle-service.js', lifecycleContext);
    const events = [];
    let observed = 0;
    const controller = lifecycleContext.FoxBearIncidentLifecycle.createController({
        global: lifecycleContext,
        document: documentRef,
        navigator: navigatorRef,
        connection: navigatorRef.connection,
        now: () => clock,
        setTimeout: lifecycleContext.setTimeout,
        clearTimeout: lifecycleContext.clearTimeout,
        routePolicy: { currentNetworkKey: () => `online|wifi|${observed}`, observeNetworkChange: () => ({ networkKey: `online|wifi|${++observed}` }) },
        onOnline: detail => events.push(['online', detail.offlineDurationMs]),
        onOffline: () => events.push(['offline']),
        onVisible: detail => events.push(['visible', detail.backgroundDurationMs]),
        onLongResume: detail => events.push(['long-resume', detail.backgroundDurationMs]),
        onConnectionChange: detail => events.push(['connection', detail.changed])
    });

    documentRef.visibilityState = 'hidden';
    await controller.handleVisibilityChange();
    clock += 6 * 60 * 1000;
    documentRef.visibilityState = 'visible';
    await controller.handleVisibilityChange();
    assert(events.some(item => item[0] === 'long-resume' && item[1] >= 5 * 60 * 1000), 'long background should trigger integrated resume');

    navigatorRef.onLine = false;
    await controller.handleOffline();
    clock += 2 * 60 * 1000;
    navigatorRef.onLine = true;
    await controller.handleOnline();
    assert(events.some(item => item[0] === 'online' && item[1] >= 2 * 60 * 1000), 'online recovery should include offline duration');

    controller.handleConnectionChange();
    assert.strictEqual(pendingTimers.at(-1).delay, 750);
    await pendingTimers.at(-1).handler();
    assert(events.some(item => item[0] === 'connection'), 'connection changes should be coordinated');
    controller.dispose();

    const firebaseSource = fs.readFileSync(path.join(root, 'src/firebase-bootstrap.js'), 'utf8');
    const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    const reporterSource = fs.readFileSync(path.join(root, 'src/boot/incident-reporter.js'), 'utf8');
    const adminSource = fs.readFileSync(path.join(root, 'src/ui/admin-incident-monitor-view.js'), 'utf8');
    assert(firebaseSource.includes("recordAttempt?.('callable')"));
    assert(firebaseSource.includes("recordAttempt?.('hosting-rewrite')"));
    assert(indexSource.indexOf('incident-lifecycle-service.js') < indexSource.indexOf('incident-reporter.js'));
    assert(swSource.includes('incident-lifecycle-service.js'));
    assert(reporterSource.includes("reason: 'long-resume'"));
    assert(reporterSource.includes("reason: 'network-change'"));
    assert(adminSource.includes('현재 브라우저 경로'));
    assert(adminSource.includes('로컬 신고 대기열'));

    console.log('v1.6.21 incident lifecycle and network exploration smoke passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
