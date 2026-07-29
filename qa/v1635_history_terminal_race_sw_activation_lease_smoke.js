#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modalSource = fs.readFileSync(path.join(root, 'src/ui/modal-controller.js'), 'utf8');
const swSource = fs.readFileSync(path.join(root, 'src/boot/service-worker-update-service.js'), 'utf8');

assert(modalSource.includes('HISTORY_TERMINAL_RELEASE_GRACE_MS = 500'), 'terminal release grace contract missing');
assert(modalSource.includes("setHistoryTransition('release-reset-page-unload')"), 'non-BFCache page unload reset missing');
assert(swSource.includes("ACTIVATION_LEASE_KEY = 'foxbear-sw-activation-lease:v1'"), 'service-worker activation lease missing');
assert(swSource.includes('ACTIVATION_WATCHDOG_MS = 12000'), 'service-worker activation watchdog missing');

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    toggle(name, force) {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
      return values.has(name);
    },
    contains: name => values.has(name)
  };
}
function style() {
  return { position: '', top: '', left: '', right: '', width: '', overflow: '', touchAction: '', setProperty() {}, removeProperty() {} };
}
function makeEventTarget() {
  const listeners = new Map();
  return {
    listeners,
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
      return event;
    }
  };
}

// Terminal recovery keeps only a short generation grace and non-BFCache unload clears the transaction.
{
  const events = makeEventTarget();
  const body = { style: style(), dataset: {}, classList: classList(), scrollTop: 0, contains: () => true };
  const document = {
    body,
    documentElement: { style: style(), dataset: {}, scrollTop: 0, clientWidth: 390, clientHeight: 760 },
    visibilityState: 'visible', activeElement: body,
    querySelector: () => null, addEventListener() {},
    createElement: () => ({ style: style(), dataset: {}, classList: classList(), setAttribute() {}, append() {}, appendChild() {}, addEventListener() {} })
  };
  let nowMs = 100000;
  const NativeDate = Date;
  class FakeDate extends NativeDate { static now() { return nowMs; } }
  let timerId = 0;
  const timers = new Map();
  let backCount = 0;
  const stack = [{ state: {} }];
  const history = {
    get state() { return stack[stack.length - 1].state; },
    replaceState(state) { stack[stack.length - 1] = { state }; },
    pushState(state) { stack.push({ state }); },
    back() { backCount += 1; }
  };
  const context = {
    console, document, history, Date: FakeDate,
    location: { href: 'https://foxbear.example/' },
    innerWidth: 390, innerHeight: 760, scrollY: 0,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    scrollTo() {}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(modalSource, context, { filename: 'modal-controller.js' });

  const layer = {
    nodeType: 1, ownerDocument: document, hidden: false, isConnected: true, inert: false,
    style: style(), dataset: {}, classList: classList(['dialog']),
    contains: target => target === layer, matches: () => true, querySelector: () => null,
    querySelectorAll: () => [], closest: () => null, setAttribute() {}, getAttribute: key => key === 'role' ? 'dialog' : null
  };
  const modal = context.FoxBearModalStateMachine;
  modal.setExternalLayerOpen(layer, true, { mode: 'dialog', panel: layer });
  const generation = history.state.__foxbearOverlaySentinelGeneration;
  layer.hidden = true;
  modal.setExternalLayerOpen(layer, false);
  assert.strictEqual(backCount, 1, 'internal Back was not requested');

  const initial = [...timers.entries()].find(([, item]) => item.delay === 1500);
  assert(initial, 'initial history watchdog missing');
  timers.delete(initial[0]);
  initial[1].callback();
  const terminal = [...timers.entries()].find(([, item]) => item.delay > 10000);
  assert(terminal, 'terminal history watchdog missing');
  timers.delete(terminal[0]);
  nowMs += terminal[1].delay;
  terminal[1].callback();

  let diagnostics = modal.getHistoryDiagnostics();
  assert.strictEqual(diagnostics.releaseInFlight, false, 'terminal recovery left the release active');
  assert.strictEqual(diagnostics.releaseTerminalGraceCount, 1, 'terminal grace was not diagnosed');
  assert.strictEqual(diagnostics.pendingReleaseGenerationCount, 1, 'terminal generation was not retained for the boundary event');

  const lateEvent = events.dispatch('popstate', { state: { __foxbearOverlayBaseGeneration: generation } });
  diagnostics = modal.getHistoryDiagnostics();
  assert.strictEqual(lateEvent.foxbearOverlayHandled, true, 'boundary-late internal popstate was not absorbed');
  assert.strictEqual(diagnostics.passThroughPopCount, 0, 'boundary-late internal popstate leaked to the exit guard');
  assert.strictEqual(diagnostics.pendingReleaseGenerationCount, 0, 'settled terminal generation remained pending');

  const second = { ...layer, hidden: false, dataset: {}, classList: classList(['dialog']) };
  modal.setExternalLayerOpen(second, true, { mode: 'dialog', panel: second });
  second.hidden = true;
  modal.setExternalLayerOpen(second, false);
  assert.strictEqual(modal.isHistoryReleaseInFlight(), true, 'second release did not start');
  events.dispatch('pagehide', { persisted: false });
  diagnostics = modal.getHistoryDiagnostics();
  assert.strictEqual(diagnostics.releaseInFlight, false, 'non-BFCache pagehide left release state active');
  assert.strictEqual(diagnostics.pendingReleaseGenerationCount, 0, 'non-BFCache pagehide left a pending generation');
  assert.strictEqual(diagnostics.releasePageUnloadResetCount, 1, 'page-unload reset was not diagnosed');
}

function createSharedStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] || null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    dump: () => new Map(values)
  };
}

function createSwRuntime(sharedStorage, randomValue) {
  const globalEvents = makeEventTarget();
  const documentEvents = makeEventTarget();
  const serviceWorkerEvents = makeEventTarget();
  let timerId = 0;
  const timers = new Map();
  let intervalId = 0;
  const intervals = new Map();
  const math = Object.create(Math);
  math.random = () => randomValue;
  class BroadcastChannelMock {
    constructor() { this.events = makeEventTarget(); }
    addEventListener(type, handler) { this.events.addEventListener(type, handler); }
    postMessage() {}
    close() {}
  }
  const document = {
    visibilityState: 'visible',
    querySelectorAll: () => [],
    addEventListener: documentEvents.addEventListener.bind(documentEvents),
    removeEventListener: documentEvents.removeEventListener.bind(documentEvents)
  };
  const navigator = {
    serviceWorker: {
      controller: {},
      addEventListener: serviceWorkerEvents.addEventListener.bind(serviceWorkerEvents),
      removeEventListener: serviceWorkerEvents.removeEventListener.bind(serviceWorkerEvents)
    }
  };
  const context = {
    console, document, navigator, localStorage: sharedStorage, BroadcastChannel: BroadcastChannelMock, Math: math,
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
  vm.runInContext(swSource, context, { filename: 'service-worker-update-service.js' });
  return { context, globalEvents, serviceWorkerEvents, timers, intervals };
}

// Only one tab owns SKIP_WAITING; controllerchange and timeout release ownership.
{
  const storage = createSharedStorage();
  const tabA = createSwRuntime(storage, 0.11111111);
  const tabB = createSwRuntime(storage, 0.22222222);
  let postsA = 0;
  let postsB = 0;
  const registrationA = { waiting: { postMessage() { postsA += 1; } }, installing: null, addEventListener() {} };
  const registrationB = { waiting: { postMessage() { postsB += 1; } }, installing: null, addEventListener() {} };
  const serviceA = tabA.context.FoxBearServiceWorkerUpdateService;
  const serviceB = tabB.context.FoxBearServiceWorkerUpdateService;
  serviceA.coordinate(registrationA, { pollMs: 500, stableIdleMs: 250 });
  serviceB.coordinate(registrationB, { pollMs: 500, stableIdleMs: 250 });

  assert.strictEqual(serviceA.requestActivation('tab-a'), true, 'first tab did not acquire activation lease');
  assert.strictEqual(serviceB.requestActivation('tab-b'), false, 'second tab acquired an already-owned activation lease');
  const claimA = [...tabA.timers.entries()].find(([, item]) => item.delay === 80);
  assert(claimA, 'first tab activation claim settle timer missing');
  tabA.timers.delete(claimA[0]);
  claimA[1].callback();
  assert.strictEqual(postsA, 1, 'first tab did not send exactly one SKIP_WAITING after claim settlement');
  assert.strictEqual(postsB, 0, 'second tab sent SKIP_WAITING without lease ownership');
  assert.strictEqual(serviceB.getSnapshot().activationLeaseBusyCount, 1, 'lease contention was not diagnosed');

  tabA.serviceWorkerEvents.dispatch('controllerchange', {});
  assert.strictEqual(serviceA.getSnapshot().activationLeaseOwned, false, 'controllerchange did not release activation lease');
  assert.strictEqual(serviceB.requestActivation('tab-b-after-change'), true, 'peer could not take activation ownership after controllerchange');
  const claimB = [...tabB.timers.entries()].find(([, item]) => item.delay === 80);
  assert(claimB, 'peer activation claim settle timer missing');
  tabB.timers.delete(claimB[0]);
  claimB[1].callback();
  assert.strictEqual(postsB, 1, 'peer did not send SKIP_WAITING after ownership transfer');

  const watchdog = [...tabB.timers.entries()].find(([, item]) => item.delay === 12000);
  assert(watchdog, 'activation watchdog timer missing');
  tabB.timers.delete(watchdog[0]);
  watchdog[1].callback();
  const snapshot = serviceB.getSnapshot();
  assert.strictEqual(snapshot.controllerChangePending, false, 'activation timeout left controllerchange pending');
  assert.strictEqual(snapshot.activationLeaseOwned, false, 'activation timeout did not release lease');
  assert.strictEqual(snapshot.activationTimeoutCount, 1, 'activation timeout was not diagnosed');
}

console.log('PASS v1.6.35 terminal history race grace, page-unload reset, and single-owner service-worker activation lease');
