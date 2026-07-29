#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/boot/service-worker-update-service.js'), 'utf8');
assert(source.includes('ACTIVATION_CLAIM_SETTLE_MS = 80'), 'activation claim settlement window missing');
assert(source.includes('leaseGeneration: expectedGeneration'), 'SKIP_WAITING message is not generation fenced');
assert(source.includes('reconcileControllerAfterResume'), 'BFCache controller reconciliation missing');

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const list = listeners.get(type) || [];
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    },
    dispatch(type, event = {}) {
      for (const handler of [...(listeners.get(type) || [])]) handler(event);
    }
  };
}

function createStorageProxy(shared, options = {}) {
  let firstLeaseRead = Boolean(options.hideFirstLeaseRead);
  return {
    get length() { return shared.size; },
    key(index) { return [...shared.keys()][index] || null; },
    getItem(key) {
      if (key === 'foxbear-sw-activation-lease:v1' && firstLeaseRead) {
        firstLeaseRead = false;
        return null;
      }
      return shared.has(key) ? shared.get(key) : null;
    },
    setItem(key, value) { shared.set(key, String(value)); },
    removeItem(key) { shared.delete(key); }
  };
}

function createRuntime(storage, randomValue) {
  const globalEvents = eventTarget();
  const documentEvents = eventTarget();
  const serviceWorkerEvents = eventTarget();
  let timerId = 0;
  let intervalId = 0;
  const timers = new Map();
  const intervals = new Map();
  const math = Object.create(Math);
  math.random = () => randomValue;
  class BroadcastChannelMock {
    addEventListener() {}
    postMessage() {}
    close() {}
  }
  const document = {
    visibilityState: 'visible',
    querySelectorAll: () => [],
    addEventListener: documentEvents.addEventListener.bind(documentEvents),
    removeEventListener: documentEvents.removeEventListener.bind(documentEvents)
  };
  const serviceWorker = {
    controller: { id: 'controller-old' },
    addEventListener: serviceWorkerEvents.addEventListener.bind(serviceWorkerEvents),
    removeEventListener: serviceWorkerEvents.removeEventListener.bind(serviceWorkerEvents)
  };
  const context = {
    console,
    document,
    navigator: { serviceWorker },
    localStorage: storage,
    BroadcastChannel: BroadcastChannelMock,
    Math: math,
    addEventListener: globalEvents.addEventListener.bind(globalEvents),
    removeEventListener: globalEvents.removeEventListener.bind(globalEvents),
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { const id = ++intervalId; intervals.set(id, { callback, delay }); return id; },
    clearInterval(id) { intervals.delete(id); }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'service-worker-update-service.js' });
  return { context, globalEvents, serviceWorkerEvents, timers, intervals, serviceWorker };
}

function runTimerByDelay(runtime, delay) {
  const entry = [...runtime.timers.entries()].find(([, timer]) => timer.delay === delay);
  assert(entry, `timer ${delay}ms missing`);
  runtime.timers.delete(entry[0]);
  entry[1].callback();
}

// Two tabs may both observe an empty lease before either write. The settlement
// window must fence the overwritten claim so only the final owner posts.
{
  const shared = new Map();
  const tabA = createRuntime(createStorageProxy(shared, { hideFirstLeaseRead: true }), 0.111111);
  const tabB = createRuntime(createStorageProxy(shared, { hideFirstLeaseRead: true }), 0.222222);
  const postsA = [];
  const postsB = [];
  const registrationA = { waiting: { postMessage(message) { postsA.push(message); } }, installing: null, addEventListener() {} };
  const registrationB = { waiting: { postMessage(message) { postsB.push(message); } }, installing: null, addEventListener() {} };
  const serviceA = tabA.context.FoxBearServiceWorkerUpdateService;
  const serviceB = tabB.context.FoxBearServiceWorkerUpdateService;
  serviceA.coordinate(registrationA, { pollMs: 500, stableIdleMs: 250 });
  serviceB.coordinate(registrationB, { pollMs: 500, stableIdleMs: 250 });

  assert.strictEqual(serviceA.requestActivation('race-a'), true, 'tab A did not enter activation claim');
  assert.strictEqual(serviceB.requestActivation('race-b'), true, 'tab B did not enter competing activation claim');
  assert.strictEqual(postsA.length + postsB.length, 0, 'SKIP_WAITING was sent before claim settlement');

  runTimerByDelay(tabA, 80);
  runTimerByDelay(tabB, 80);
  assert.strictEqual(postsA.length + postsB.length, 1, 'competing activation claims sent multiple SKIP_WAITING messages');
  assert.strictEqual(postsA.length, 0, 'overwritten activation claim was not fenced');
  assert.strictEqual(postsB.length, 1, 'final activation lease owner did not send SKIP_WAITING');
  assert.strictEqual(postsB[0].leaseGeneration, serviceB.getSnapshot().activationLeaseGeneration, 'message generation does not match owned lease');
  assert.strictEqual(serviceA.getSnapshot().activationClaimFencedCount, 1, 'fenced activation claim was not diagnosed');

  // A stale watchdog from generation N must not delete generation N+1.
  const current = serviceB.getSnapshot();
  const newer = {
    token: current.tabId,
    generation: current.activationLeaseGeneration + 1,
    acquiredAt: Date.now(),
    expiresAt: Date.now() + 15000
  };
  shared.set('foxbear-sw-activation-lease:v1', JSON.stringify(newer));
  runTimerByDelay(tabB, 12000);
  const stored = JSON.parse(shared.get('foxbear-sw-activation-lease:v1'));
  assert.strictEqual(stored.generation, newer.generation, 'stale activation watchdog removed the newer lease generation');
}

// A controllerchange may be frozen while the page is in BFCache. pageshow must
// reconcile the changed controller once, and a later duplicate event must not
// release ownership twice.
{
  const shared = new Map();
  const runtime = createRuntime(createStorageProxy(shared), 0.333333);
  const posts = [];
  const registration = { waiting: { postMessage(message) { posts.push(message); } }, installing: null, addEventListener() {} };
  const service = runtime.context.FoxBearServiceWorkerUpdateService;
  service.coordinate(registration, { pollMs: 500, stableIdleMs: 250 });
  assert.strictEqual(service.requestActivation('bfcache-race'), true, 'activation claim did not start');
  runTimerByDelay(runtime, 80);
  assert.strictEqual(posts.length, 1, 'settled activation claim did not post');
  assert.strictEqual(service.getSnapshot().controllerChangePending, true, 'controller change was not marked pending');

  runtime.globalEvents.dispatch('pagehide', { persisted: true });
  runtime.serviceWorker.controller = { id: 'controller-new' };
  runtime.globalEvents.dispatch('pageshow', { persisted: true });
  let snapshot = service.getSnapshot();
  assert.strictEqual(snapshot.controllerChangePending, false, 'BFCache pageshow did not reconcile a missed controllerchange');
  assert.strictEqual(snapshot.activationLeaseOwned, false, 'BFCache controller reconciliation retained the activation lease');
  assert.strictEqual(snapshot.activationResumeReconcileCount, 1, 'BFCache controller reconciliation was not diagnosed');
  const releases = snapshot.activationLeaseReleaseCount;

  runtime.serviceWorkerEvents.dispatch('controllerchange', {});
  snapshot = service.getSnapshot();
  assert.strictEqual(snapshot.activationLeaseReleaseCount, releases, 'duplicate controllerchange released the lease twice');
  assert.strictEqual(snapshot.activationControllerChangeDedupCount, 1, 'duplicate controllerchange was not diagnosed');
}

console.log('PASS v1.6.36 service-worker activation generation fencing and BFCache controller reconciliation');
