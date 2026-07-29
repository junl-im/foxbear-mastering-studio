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

assert(modalSource.includes("const HISTORY_SENTINEL_GENERATION_KEY = '__foxbearOverlaySentinelGeneration'"), 'sentinel generation marker missing');
assert(modalSource.includes("const HISTORY_BASE_GENERATION_KEY = '__foxbearOverlayBaseGeneration'"), 'base generation marker missing');
assert(modalSource.includes('isInternalHistoryReleaseEvent,'), 'generation-aware release classifier is not exported');
assert(modalSource.includes("global.addEventListener('pagehide'"), 'history pagehide recovery listener missing');
assert(modalSource.includes("global.addEventListener('pageshow'"), 'history pageshow recovery listener missing');
assert(guardSource.includes('isInternalHistoryReleaseEvent?.(event)'), 'exit guard does not use the generation-aware classifier');
assert(performanceSource.includes('overlay history:'), 'overlay history diagnostics output missing');

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
  go(delta) {
    if (Number(delta) === -1) this.back();
  }
};

function completePendingBack({ dispatchPopstate = true } = {}) {
  assert(pendingBacks.length > 0, 'no pending history traversal');
  const expectedState = pendingBacks.shift();
  if (historyStack.length > 1) historyStack.pop();
  assert.deepStrictEqual(history.state, expectedState, 'history stack target differs from queued traversal');
  if (dispatchPopstate) return dispatch('popstate', { state: history.state });
  return history.state;
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

// Preserve production listener order: exit guard first, modal controller second.
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

// 1) A delayed internal popstate must not consume a newer genuine user Back.
const delayed = makeLayer('delayed-release');
openLayer(delayed);
const firstSentinelState = { ...history.state };
assert.strictEqual(firstSentinelState.__foxbearOverlaySentinel, true, 'overlay sentinel was not installed');
assert(Number.isSafeInteger(firstSentinelState.__foxbearOverlaySentinelGeneration), 'sentinel generation was not stored');
closeLayer(delayed);
assert.strictEqual(backRequestCount, 1, 'normal close did not request internal Back');
const delayedBaseState = { ...pendingBacks[0] };
assert.strictEqual(delayedBaseState.__foxbearOverlayBaseGeneration, firstSentinelState.__foxbearOverlaySentinelGeneration, 'base and sentinel generations differ');

// Deliver a genuine Back to an older entry before the queued internal traversal.
dispatch('popstate', { state: { foxbearEntry: true } });
assert.strictEqual(confirmCount, 1, 'genuine Back was swallowed by the delayed internal release flag');
assert.strictEqual(modal.isHistoryReleaseInFlight(), false, 'mismatched generation did not abandon the active release');

// The delayed internal traversal arrives afterward and must be absorbed without a second prompt.
completePendingBack({ dispatchPopstate: false });
dispatch('popstate', { state: delayedBaseState });
assert.strictEqual(confirmCount, 1, 'delayed internal popstate opened another exit confirmation');
let diagnostics = modal.getHistoryDiagnostics();
assert.strictEqual(diagnostics.releaseGenerationMismatchCount, 1, 'generation mismatch was not diagnosed');
assert.strictEqual(diagnostics.staleInternalReleasePopCount, 1, 'stale internal popstate was not diagnosed');

// 2) If BFCache hides the page after history.back completed but before popstate,
// pageshow must settle the exact generation without pushing a duplicate exit guard.
const bfcacheLayer = makeLayer('bfcache-release');
openLayer(bfcacheLayer);
const bfcacheGeneration = history.state.__foxbearOverlaySentinelGeneration;
closeLayer(bfcacheLayer);
assert.strictEqual(backRequestCount, 2, 'BFCache scenario did not request internal Back');
dispatch('pagehide', { persisted: true });
completePendingBack({ dispatchPopstate: false });
const stackLengthBeforeShow = historyStack.length;
dispatch('pageshow', { persisted: true });
assert.strictEqual(historyStack.length, stackLengthBeforeShow, 'BFCache restore pushed a duplicate exit guard');
assert.strictEqual(confirmCount, 1, 'BFCache recovery produced a false exit confirmation');
diagnostics = modal.getHistoryDiagnostics();
assert.strictEqual(diagnostics.releaseRecoveredCount, 1, 'BFCache-completed release was not recovered');
assert.strictEqual(diagnostics.releaseSuspended, false, 'BFCache release remained suspended');
assert.strictEqual(diagnostics.releaseInFlight, false, 'BFCache release remained active');
assert.strictEqual(history.state.__foxbearOverlayBaseGeneration, bfcacheGeneration, 'BFCache restored the wrong base generation');

// 3) Exercise representative dialog families through rapid open/close cycles.
for (const name of ['download', 'recommendation', 'settings', 'incident']) {
  const layer = makeLayer(name);
  openLayer(layer);
  const generation = history.state.__foxbearOverlaySentinelGeneration;
  assert(generation > bfcacheGeneration, `${name} did not receive a newer sentinel generation`);
  closeLayer(layer);
  completePendingBack();
  assert.strictEqual(confirmCount, 1, `${name} internal release reached the exit confirmation`);
}

// A real Back still closes an active overlay, then the following Back reaches the exit guard.
const finalLayer = makeLayer('final-user-back');
openLayer(finalLayer);
assert.strictEqual(history.state.__foxbearOverlaySentinel, true, 'final overlay sentinel missing');
if (historyStack.length > 1) historyStack.pop();
dispatch('popstate', { state: history.state });
assert.strictEqual(modal.getOpenLayerCount(), 0, 'real Back did not close the final overlay');
assert.strictEqual(confirmCount, 1, 'overlay-closing Back opened the exit confirmation');
dispatch('popstate', { state: { foxbearEntry: true } });
assert.strictEqual(confirmCount, 2, 'workspace Back did not reach the exit confirmation');

const guardDiagnostics = context.FoxBearSiteGuards.getNavigationExitGuardState();
diagnostics = modal.getHistoryDiagnostics();
assert(diagnostics.sentinelPushCount >= 7, 'representative dialog generations were not installed');
assert(diagnostics.internalReleasePopCount >= 6, 'internal release events were not counted');
assert.strictEqual(guardDiagnostics.lastPopstateSource, 'user-back', 'final Back classification is incorrect');
assert(guardDiagnostics.overlayReleaseSkips >= 5, 'exit guard did not skip exact internal generations');

console.log('PASS v1.6.32 overlay history generation and BFCache recovery smoke');
