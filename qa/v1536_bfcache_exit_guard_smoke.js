'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/security/site-guards.js'), 'utf8');
assert(source.includes("global.addEventListener('pageshow', handlePageShowGuard)"), 'pageshow BFCache recovery listener missing');
assert(source.includes('if (!event?.persisted || !navigationExitGuardState.installed) return;'), 'BFCache persisted guard missing');
assert(source.includes('navigationExitGuardState.allowLeave = false;'), 'BFCache leave flag reset missing');

const listeners = new Map();
const add = (type, handler) => {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(handler);
};
const remove = (type, handler) => listeners.get(type)?.delete(handler);
let pushes = 0;
const document = {
  visibilityState: 'visible',
  documentElement: { dataset: {} },
  head: { textContent: '', append() {} },
  body: { textContent: '', className: '', appendChild() {}, classList: { add() {} } },
  createElement() { return { setAttribute() {}, append() {}, appendChild() {}, addEventListener() {}, className: '', textContent: '', type: '' }; },
  addEventListener() {}
};
const context = {
  console,
  document,
  location: { href: 'https://example.test/', protocol: 'https:', hostname: 'example.test', reload() {} },
  history: {
    state: null,
    replaceState(state) { this.state = state; },
    pushState(state) { this.state = state; pushes += 1; },
    go() {},
    back() {}
  },
  localStorage: { getItem() { return ''; } },
  addEventListener: add,
  removeEventListener: remove,
  setTimeout,
  clearTimeout,
  confirm() { return false; },
  close() {}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'site-guards.js' });

const service = context.FoxBearSiteGuards;
service.installNavigationExitGuard({ shouldBlock: () => true });
assert.strictEqual(pushes, 1, 'initial exit guard history state was not pushed');
for (const handler of listeners.get('pagehide') || []) handler({ persisted: true });
assert.strictEqual(service.getNavigationExitGuardState().pageHiding, true, 'pagehide state not recorded');
for (const handler of listeners.get('pageshow') || []) handler({ persisted: true });
const restored = service.getNavigationExitGuardState();
assert.strictEqual(restored.pageHiding, false, 'BFCache restore left pageHiding stuck');
assert.strictEqual(restored.allowLeave, false, 'BFCache restore left allowLeave enabled');
assert.strictEqual(restored.bfcacheReady, true, 'BFCache readiness not exposed');
assert.strictEqual(pushes, 1, 'BFCache restore duplicated an exit guard that was already current');
context.history.state = {};
for (const handler of listeners.get('pagehide') || []) handler({ persisted: true });
for (const handler of listeners.get('pageshow') || []) handler({ persisted: true });
assert.strictEqual(pushes, 2, 'BFCache restore did not rebuild a missing history exit guard');
assert((listeners.get('beforeunload') || new Set()).size >= 1, 'beforeunload guard missing after BFCache restore');

console.log('PASS v1.5.36 BFCache navigation exit guard recovery smoke');
