#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modalSource = fs.readFileSync(path.join(root, 'src/ui/modal-controller.js'), 'utf8');
const guardSource = fs.readFileSync(path.join(root, 'src/security/site-guards.js'), 'utf8');

assert(modalSource.includes('isHistoryReleaseInFlight: () => historyReleaseInFlight'), 'overlay history-release state is not exposed');
assert(guardSource.includes('const overlayHistoryRelease = overlayManager?.isInternalHistoryReleaseEvent?.(event) === true;'), 'exit guard does not classify the exact internal overlay history release event');
assert(guardSource.includes('event?.foxbearOverlayHandled === true || overlayOpen || overlayHistoryRelease'), 'exit guard does not suppress internal overlay popstate');
const noLayerIndex = modalSource.indexOf('if (!layers.length) {');
const handledAfterLayerIndex = modalSource.indexOf('event.foxbearOverlayHandled = true', noLayerIndex);
assert(noLayerIndex >= 0 && handledAfterLayerIndex > noLayerIndex, 'modal controller must not consume genuine Back when no overlay is open');

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
let popCount = 0;
const historyStack = [{ state: {} }];
const context = {
  console,
  document,
  innerWidth: 390,
  innerHeight: 760,
  scrollY: 0,
  location: { href: 'https://foxbear-music.web.app/', protocol: 'https:', hostname: 'foxbear-music.web.app', reload() {} },
  history: {
    get state() { return historyStack[historyStack.length - 1]?.state || null; },
    replaceState(next) { historyStack[historyStack.length - 1] = { state: next }; },
    pushState(next) { historyStack.push({ state: next }); },
    back() {
      popCount += 1;
      if (historyStack.length > 1) historyStack.pop();
      dispatch('popstate', { state: this.state });
    },
    go() {}
  },
  localStorage: { getItem() { return ''; } },
  addEventListener: addListener,
  removeEventListener: removeListener,
  setTimeout(callback) { callback(); return 1; },
  clearTimeout() {},
  scrollTo() {},
  close() {},
  confirm() { confirmCount += 1; return false; },
  getComputedStyle: () => ({ display: 'block', visibility: 'visible' })
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

// The exit guard is installed before the modal popstate listener in the real app.
vm.runInContext(guardSource, context, { filename: 'site-guards.js' });
context.FoxBearSiteGuards.installNavigationExitGuard({ shouldBlock: () => true });
vm.runInContext(modalSource, context, { filename: 'modal-controller.js' });

function makeLayer() {
  const attributes = new Map([['role', 'dialog']]);
  const layer = {
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

const layer = makeLayer();
const modal = context.FoxBearModalStateMachine;
modal.setExternalLayerOpen(layer, true, { mode: 'dialog', panel: layer });
assert.strictEqual(modal.getOpenLayerCount(), 1, 'test overlay did not open');
modal.setExternalLayerOpen(layer, false);
assert.strictEqual(popCount, 1, 'programmatic sentinel release did not call history.back');
assert.strictEqual(confirmCount, 0, 'programmatic overlay close was mistaken for user Back');
assert.strictEqual(modal.isHistoryReleaseInFlight(), false, 'history release flag did not clear after popstate');

const genuineBackEvent = dispatch('popstate', { state: { foxbearEntry: true } });
assert.strictEqual(confirmCount, 1, 'genuine Back must still reach the navigation exit guard');
assert.notStrictEqual(genuineBackEvent.foxbearOverlayHandled, true, 'modal controller consumed genuine Back with no overlay');

console.log('PASS v1.6.30 overlay history release false exit prompt smoke');
