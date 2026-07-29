#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modalSource = fs.readFileSync(path.join(root, 'src/ui/modal-controller.js'), 'utf8');
const swUpdateSource = fs.readFileSync(path.join(root, 'src/boot/service-worker-update-service.js'), 'utf8');

assert(modalSource.includes('HISTORY_RELEASE_HARD_STALL_RECOVERY_MS = 30000'), 'terminal hard-stall recovery deadline missing');
assert(modalSource.includes('function reconcileTerminalHistoryRelease(releaseEpoch)'), 'terminal hard-stall recovery helper missing');
assert(modalSource.includes('releaseHardStallRecoveredCount'), 'terminal hard-stall recovery diagnostics missing');
assert(swUpdateSource.includes('const observedRegistrations = new WeakSet()'), 'service-worker registration observer dedupe missing');
assert(swUpdateSource.includes('function pauseActivityChannel(reason'), 'activity pause helper missing');
assert(swUpdateSource.includes('function resumeActivityChannel(reason'), 'activity resume helper missing');

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

// Modal hard-stall terminal recovery.
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
    console, document, history,
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
  const firstGeneration = history.state.__foxbearOverlaySentinelGeneration;
  layer.hidden = true;
  modal.setExternalLayerOpen(layer, false);
  assert.strictEqual(backCount, 1, 'initial internal Back was not requested');

  const firstTimer = [...timers.entries()].sort((a, b) => a[1].delay - b[1].delay)[0];
  timers.delete(firstTimer[0]);
  firstTimer[1].callback();
  assert.strictEqual(modal.isHistoryReleaseInFlight(), true, 'initial watchdog should preserve an unchanged sentinel');
  const terminalTimer = [...timers.entries()].find(([, item]) => item.delay > 10000);
  assert(terminalTimer, 'terminal hard-stall timer was not scheduled');
  timers.delete(terminalTimer[0]);
  terminalTimer[1].callback();
  assert.strictEqual(modal.isHistoryReleaseInFlight(), false, 'terminal hard-stall recovery did not clear in-flight state');
  assert.strictEqual(history.state.__foxbearOverlaySentinel, undefined, 'terminal hard-stall recovery left a stale sentinel');
  assert.strictEqual(backCount, 1, 'terminal recovery issued a duplicate Back');
  const diagnostics = modal.getHistoryDiagnostics();
  assert.strictEqual(diagnostics.releaseHardStallRecoveredCount, 1, 'terminal hard-stall recovery was not diagnosed');

  const second = { ...layer, hidden: false, dataset: {}, classList: classList(['dialog']) };
  modal.setExternalLayerOpen(second, true, { mode: 'dialog', panel: second });
  assert(history.state.__foxbearOverlaySentinelGeneration > firstGeneration, 'fresh overlay did not receive a new sentinel after recovery');
}

// Service-worker activity lifecycle and observer idempotency.
{
  const events = makeEventTarget();
  const documentEvents = makeEventTarget();
  const storage = new Map();
  const localStorage = {
    get length() { return storage.size; },
    key(index) { return [...storage.keys()][index] || null; },
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  let intervalId = 0;
  const intervals = new Map();
  let channelCreateCount = 0;
  let channelCloseCount = 0;
  class BroadcastChannelMock {
    constructor() { channelCreateCount += 1; this.events = makeEventTarget(); }
    addEventListener(type, handler) { this.events.addEventListener(type, handler); }
    postMessage() {}
    close() { channelCloseCount += 1; }
  }
  const navigator = { serviceWorker: { controller: {}, addEventListener() {} } };
  const document = {
    visibilityState: 'visible',
    querySelectorAll: () => [],
    addEventListener: documentEvents.addEventListener.bind(documentEvents),
    removeEventListener: documentEvents.removeEventListener.bind(documentEvents)
  };
  const context = {
    console, navigator, document, localStorage, BroadcastChannel: BroadcastChannelMock,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    setInterval(callback) { const id = ++intervalId; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(swUpdateSource, context, { filename: 'service-worker-update-service.js' });

  const registrationTarget = makeEventTarget();
  const registration = {
    waiting: null, installing: null,
    addEventListener: registrationTarget.addEventListener.bind(registrationTarget)
  };
  const service = context.FoxBearServiceWorkerUpdateService;
  service.coordinate(registration, { pollMs: 500 });
  service.coordinate(registration, { pollMs: 700 });
  assert.strictEqual((registrationTarget.listeners.get('updatefound') || []).length, 1, 'duplicate updatefound listener was installed');
  assert.strictEqual(intervals.size, 1, 'heartbeat interval was not singular');

  events.dispatch('pagehide', { persisted: true });
  let snapshot = service.getSnapshot();
  assert.strictEqual(snapshot.activitySuspended, true, 'BFCache pagehide did not suspend activity publishing');
  assert.strictEqual(snapshot.heartbeatActive, false, 'BFCache pagehide left the heartbeat interval active');
  assert.strictEqual(channelCloseCount, 1, 'BFCache pagehide did not close the activity channel');

  events.dispatch('pageshow', { persisted: true });
  snapshot = service.getSnapshot();
  assert.strictEqual(snapshot.activitySuspended, false, 'BFCache pageshow did not resume activity publishing');
  assert.strictEqual(snapshot.heartbeatActive, true, 'BFCache pageshow did not restore the heartbeat interval');
  assert.strictEqual(intervals.size, 1, 'BFCache resume created duplicate heartbeat intervals');
  assert(channelCreateCount >= 2, 'BFCache resume did not reopen BroadcastChannel');
  assert.strictEqual(snapshot.observedRegistrationCount, 1, 'registration observer count is not idempotent');
}

console.log('PASS v1.6.34 terminal history hard-stall recovery and BFCache-safe service-worker activity lifecycle');
