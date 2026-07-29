#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modalSource = fs.readFileSync(path.join(root, 'src/ui/modal-controller.js'), 'utf8');
const guardSource = fs.readFileSync(path.join(root, 'src/security/site-guards.js'), 'utf8');

assert(modalSource.includes('function reconcileHistoryReleaseWatchdog(releaseEpoch)'), 'history watchdog recovery helper missing');
assert(modalSource.includes('releaseWatchdogRecoveredCount'), 'watchdog recovery diagnostics missing');
assert(modalSource.includes('const HISTORY_PENDING_RELEASE_LIMIT = 8'), 'pending release generation bound missing');
assert(!modalSource.includes("setHistoryTransition('release-popstate-stalled');\n        }, HISTORY_RELEASE_WATCHDOG_MS)"), 'legacy flag-only watchdog remains');

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
    contains: name => values.has(name),
    [Symbol.iterator]: function* iterator() { yield* values; }
  };
}

function style() {
  const values = new Map();
  return {
    position: '', top: '', left: '', right: '', width: '', overflow: '', touchAction: '',
    setProperty: (name, value) => values.set(name, String(value)),
    removeProperty: name => values.delete(name)
  };
}

const listeners = new Map();
function addListener(type, handler) {
  if (!listeners.has(type)) listeners.set(type, []);
  const group = listeners.get(type);
  if (!group.includes(handler)) group.push(handler);
}
function removeListener(type, handler) {
  const group = listeners.get(type) || [];
  const index = group.indexOf(handler);
  if (index >= 0) group.splice(index, 1);
}
function dispatch(type, event = {}) {
  for (const handler of [...(listeners.get(type) || [])]) handler(event);
  return event;
}

const body = {
  style: style(), dataset: {}, classList: classList(), scrollTop: 0,
  contains: () => true, appendChild() {}, textContent: '', className: ''
};
const documentElement = { style: style(), dataset: {}, scrollTop: 0, clientWidth: 390, clientHeight: 760 };
const document = {
  body,
  documentElement,
  visibilityState: 'visible',
  activeElement: body,
  head: { textContent: '', append() {} },
  querySelector: () => null,
  addEventListener() {},
  createElement() {
    return {
      style: style(), dataset: {}, classList: classList(),
      setAttribute() {}, append() {}, appendChild() {}, addEventListener() {},
      textContent: '', className: '', type: ''
    };
  }
};

let confirmCount = 0;
let backRequestCount = 0;
let nextTimerId = 1;
const timers = new Map();
const historyStack = [{ state: {} }];
const pendingBacks = [];
const history = {
  get state() { return historyStack[historyStack.length - 1]?.state || null; },
  replaceState(next) { historyStack[historyStack.length - 1] = { state: next }; },
  pushState(next) { historyStack.push({ state: next }); },
  back() {
    backRequestCount += 1;
    pendingBacks.push(historyStack[Math.max(0, historyStack.length - 2)]?.state || null);
  },
  go(delta) { if (Number(delta) === -1) this.back(); }
};

function completePendingBack({ dispatchPopstate = true } = {}) {
  assert(pendingBacks.length > 0, 'no pending history traversal');
  const expectedState = pendingBacks.shift();
  if (historyStack.length > 1) historyStack.pop();
  assert.deepStrictEqual(history.state, expectedState, 'history traversal target mismatch');
  if (dispatchPopstate) dispatch('popstate', { state: history.state });
}

function runLatestTimer() {
  const entry = Array.from(timers.entries()).pop();
  assert(entry, 'expected watchdog timer');
  const [id, callback] = entry;
  timers.delete(id);
  callback();
}

const context = {
  console,
  document,
  innerWidth: 390,
  innerHeight: 760,
  scrollY: 0,
  location: { href: 'https://foxbear-music.web.app/', protocol: 'https:', hostname: 'foxbear-music.web.app', reload() {} },
  history,
  localStorage: { getItem() { return ''; } },
  addEventListener: addListener,
  removeEventListener: removeListener,
  setTimeout(callback) { const id = nextTimerId++; timers.set(id, callback); return id; },
  clearTimeout(id) { timers.delete(id); },
  scrollTo() {},
  close() {},
  confirm() { confirmCount += 1; return false; },
  getComputedStyle: () => ({ display: 'block', visibility: 'visible' })
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

vm.runInContext(guardSource, context, { filename: 'site-guards.js' });
context.FoxBearSiteGuards.installNavigationExitGuard({ shouldBlock: () => true });
vm.runInContext(modalSource, context, { filename: 'modal-controller.js' });

function makeLayer(name) {
  const attributes = new Map([['role', 'dialog']]);
  return {
    name,
    nodeType: 1,
    ownerDocument: document,
    hidden: false,
    isConnected: true,
    inert: false,
    style: style(),
    dataset: {},
    classList: classList(['test-dialog']),
    firstElementChild: null,
    contains(target) { return target === this; },
    matches: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    setAttribute(key, value) { attributes.set(key, String(value)); },
    getAttribute(key) { return attributes.get(key) || null; }
  };
}

const modal = context.FoxBearModalStateMachine;
function openLayer(layer) {
  layer.hidden = false;
  modal.setExternalLayerOpen(layer, true, { mode: 'dialog', panel: layer });
}
function closeLayer(layer) {
  layer.hidden = true;
  modal.setExternalLayerOpen(layer, false);
}

// Browser traversal completed, but popstate was omitted. The watchdog must
// reconcile the destination generation instead of leaving the controller stuck.
const omittedPop = makeLayer('omitted-popstate');
openLayer(omittedPop);
const firstGeneration = history.state.__foxbearOverlaySentinelGeneration;
closeLayer(omittedPop);
assert.strictEqual(backRequestCount, 1, 'internal release did not request Back');
completePendingBack({ dispatchPopstate: false });
assert.strictEqual(modal.isHistoryReleaseInFlight(), true, 'release settled before watchdog despite omitted popstate');
runLatestTimer();
assert.strictEqual(modal.isHistoryReleaseInFlight(), false, 'watchdog did not settle completed traversal');
let diagnostics = modal.getHistoryDiagnostics();
assert.strictEqual(diagnostics.releaseWatchdogRecoveredCount, 1, 'watchdog recovery was not diagnosed');
assert.strictEqual(diagnostics.releaseHardStallCount, 0, 'completed traversal was misdiagnosed as a hard stall');
assert.strictEqual(confirmCount, 0, 'watchdog recovery reached the exit confirmation');

// A following overlay must receive a new sentinel, proving the old in-flight
// transaction no longer blocks overlay history protection.
const following = makeLayer('following-overlay');
openLayer(following);
assert(history.state.__foxbearOverlaySentinelGeneration > firstGeneration, 'new overlay did not receive a fresh generation');
closeLayer(following);
completePendingBack();
assert.strictEqual(confirmCount, 0, 'normal release after watchdog recovery reached exit confirmation');

// If traversal has not moved at all, the watchdog must not issue another Back;
// duplicate traversal requests can skip past the workspace exit guard.
const stalled = makeLayer('stalled-traversal');
openLayer(stalled);
closeLayer(stalled);
const beforeStallWatchdog = backRequestCount;
runLatestTimer();
assert.strictEqual(backRequestCount, beforeStallWatchdog, 'watchdog issued a duplicate Back request');
assert.strictEqual(modal.isHistoryReleaseInFlight(), true, 'unchanged sentinel should remain safely classified as in-flight');
diagnostics = modal.getHistoryDiagnostics();
assert.strictEqual(diagnostics.releaseHardStallCount, 1, 'hard stall was not diagnosed');
completePendingBack();
assert.strictEqual(modal.isHistoryReleaseInFlight(), false, 'late traversal did not settle after hard stall');
assert.strictEqual(confirmCount, 0, 'late internal traversal reached exit confirmation');

console.log('PASS v1.6.33 overlay history watchdog recovery and bounded pending generations smoke');
