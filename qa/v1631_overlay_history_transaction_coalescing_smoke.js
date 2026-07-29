#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modalSource = fs.readFileSync(path.join(root, 'src/ui/modal-controller.js'), 'utf8');
const guardSource = fs.readFileSync(path.join(root, 'src/security/site-guards.js'), 'utf8');
const performanceSource = fs.readFileSync(path.join(root, 'src/boot/performance-diagnostics.js'), 'utf8');

assert(modalSource.includes('if (historyReleaseInFlight) {'), 'rapid overlay releases are not coalesced');
assert(modalSource.includes("setHistoryTransition('release-coalesced')"), 'coalesced release diagnostics missing');
assert(modalSource.includes('if (historyEligibleLayers().length) {'), 'overlay sentinel is not re-armed after an internal release');
assert(modalSource.includes('getHistoryDiagnostics,'), 'overlay history diagnostics are not exported');
assert(guardSource.includes("lastPopstateSource = 'internal-overlay-release'"), 'exit guard does not classify internal overlay release');
assert(guardSource.includes("lastPopstateSource = 'user-back'"), 'exit guard does not classify user Back');
assert(performanceSource.includes('FoxBearModalStateMachine?.getHistoryDiagnostics'), 'performance diagnostics do not collect overlay history state');

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
  listeners.get(type).push(handler);
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
    pendingBacks.push('back');
  },
  go(delta) {
    if (Number(delta) === -1) {
      backRequestCount += 1;
      pendingBacks.push('back');
    }
  }
};

function flushOneBack() {
  assert(pendingBacks.length > 0, 'no pending history traversal to flush');
  pendingBacks.shift();
  if (historyStack.length > 1) historyStack.pop();
  return dispatch('popstate', { state: history.state });
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

// Keep the production listener order: exit guard first, modal controller second.
vm.runInContext(guardSource, context, { filename: 'site-guards.js' });
context.FoxBearSiteGuards.installNavigationExitGuard({ shouldBlock: () => true });
vm.runInContext(modalSource, context, { filename: 'modal-controller.js' });

function makeLayer(name) {
  const attributes = new Map([['role', 'dialog']]);
  const layer = {
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
    contains: target => target === layer,
    matches: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    setAttribute(key, value) { attributes.set(key, String(value)); },
    getAttribute(key) { return attributes.get(key) || null; }
  };
  return layer;
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

const first = makeLayer('first');
const second = makeLayer('second');
openLayer(first);
closeLayer(first);
assert.strictEqual(backRequestCount, 1, 'first normal close must request one internal Back');

// Reopen and close before the first programmatic popstate arrives. This used to
// queue a second Back and could traverse into the workspace exit sentinel.
openLayer(second);
closeLayer(second);
assert.strictEqual(backRequestCount, 1, 'rapid reopen-close queued duplicate internal Back');
assert.strictEqual(modal.getHistoryDiagnostics().coalescedReleaseCount, 1, 'coalesced release was not diagnosed');
flushOneBack();
assert.strictEqual(confirmCount, 0, 'coalesced internal release was mistaken for user Back');
assert.strictEqual(modal.isHistoryReleaseInFlight(), false, 'internal release did not settle');

// If a dialog remains open while the old sentinel is released, the controller
// must install a fresh sentinel after that popstate.
const third = makeLayer('third');
openLayer(third);
closeLayer(third);
const fourth = makeLayer('fourth');
openLayer(fourth);
assert.strictEqual(backRequestCount, 2, 'second internal release was not requested');
flushOneBack();
assert.strictEqual(confirmCount, 0, 'release with a reopened overlay reached the exit confirmation');
assert.strictEqual(modal.getOpenLayerCount(), 1, 'reopened overlay was closed by the old release popstate');
assert.strictEqual(modal.getHistoryDiagnostics().releaseRearmCount, 1, 'sentinel was not re-armed for reopened overlay');
assert.strictEqual(Boolean(history.state?.__foxbearOverlaySentinel), true, 're-armed overlay sentinel is missing');

// A genuine user Back closes the overlay first, while the next genuine Back
// reaches the workspace exit confirmation.
history.back();
flushOneBack();
assert.strictEqual(modal.getOpenLayerCount(), 0, 'genuine Back did not close the active overlay');
assert.strictEqual(confirmCount, 0, 'overlay-closing Back incorrectly opened exit confirmation');
history.back();
flushOneBack();
assert.strictEqual(confirmCount, 1, 'genuine workspace Back did not reach exit confirmation');

const modalDiagnostics = modal.getHistoryDiagnostics();
const guardDiagnostics = context.FoxBearSiteGuards.getNavigationExitGuardState();
assert.strictEqual(modalDiagnostics.userBackCloseCount, 1, 'overlay user-Back count is incorrect');
assert(modalDiagnostics.internalReleasePopCount >= 2, 'internal release popstates were not counted');
assert(guardDiagnostics.overlayReleaseSkips >= 2, 'exit guard did not classify internal release popstates');
assert.strictEqual(guardDiagnostics.userBackCount, 1, 'exit guard user-Back count is incorrect');
assert.strictEqual(guardDiagnostics.lastPopstateSource, 'user-back', 'last popstate classification is incorrect');

console.log('PASS v1.6.31 overlay history transaction coalescing smoke');
