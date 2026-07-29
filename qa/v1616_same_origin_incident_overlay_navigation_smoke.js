#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebaseConfig = JSON.parse(read('firebase.json'));
const firebase = read('src/firebase-bootstrap.js');
const reporter = read('src/boot/incident-reporter.js');
const recoveryPolicy = read('src/boot/incident-recovery-policy.js');
const modal = read('src/ui/modal-controller.js');
const html = read('index.html');
const overlayCss = read('assets/css/components/floating-overlays.css');
const siteGuards = read('src/security/site-guards.js');
const settingsCss = read('assets/css/components/support-settings.css');

assert.strictEqual(pkg.version, '1.6.39');
assert.match(pkg.foxbearRelease.buildId, /^[a-z0-9][a-z0-9-]*$/);
assert.strictEqual(pkg.foxbearRelease.assetVersion, `${pkg.version}-${pkg.foxbearRelease.buildId}`);

const rewrites = firebaseConfig.hosting?.rewrites || [];
const rewriteMap = new Map(rewrites.map(item => [item.source, item.function?.functionId]));
assert.strictEqual(rewriteMap.get('/api/incident/status'), 'getIncidentServiceStatus');
assert.strictEqual(rewriteMap.get('/api/incident/submit'), 'submitIncidentReport');
assert.strictEqual(rewriteMap.get('/api/incident/delivery'), 'getIncidentDeliveryStatus');
assert.strictEqual(rewriteMap.get('/api/incident/readiness'), 'checkIncidentDeploymentReadiness');
assert(rewrites.every(item => item.function?.region === 'asia-northeast3'), 'incident rewrites must use the deployed Functions region');

assert(firebase.includes('const INCIDENT_SAME_ORIGIN_PATHS = Object.freeze'), 'same-origin incident path map missing');
assert(firebase.includes('async function invokeIncidentCallableSameOrigin'), 'same-origin callable fallback missing');
assert(firebase.includes("headers.Authorization = `Bearer ${token}`"), 'same-origin fallback must preserve Firebase auth');
assert(firebase.includes("headers['X-Firebase-AppCheck'] = appCheckResult.token"), 'same-origin fallback must preserve App Check when available');
assert(firebase.includes("body: JSON.stringify({ data: data || {} })"), 'same-origin fallback must use the Callable protocol envelope');
assert(firebase.includes("transport: 'hosting-rewrite'"), 'same-origin transport marker missing');
assert(firebase.includes('Firebase Callable 기본 경로와 Hosting same-origin 복구 경로가 모두 실패했습니다.'), 'dual-path failure evidence missing');

for (const id of ['incidentSameOriginStatus', 'incidentRecoveryActions', 'incidentRecoveryActionLabel', 'incidentRecoveryActionButtons']) {
  assert(html.includes(`id="${id}"`), `${id} UI missing`);
}
assert(reporter.includes('const getRecoveryActionPlan = recoveryPolicy.getActionPlan'), 'status-specific recovery plan bridge missing');
assert(reporter.includes('function renderRecoveryActions'), 'one-line recovery action renderer missing');
assert(recoveryPolicy.includes("'server-api-not-deployed': Object.freeze({ label:"), 'deployment recovery action missing');
assert(recoveryPolicy.includes("'smtp-auth-failed': Object.freeze({ label:"), 'SMTP recovery action missing');
assert(reporter.includes("sameOriginStatusPath: cleanText"), 'sanitized diagnostics must include same-origin route state');
assert(settingsCss.includes('.incident-recovery-actions'), 'one-line recovery action styling missing');

assert(modal.includes('const HISTORY_SENTINEL_KEY'), 'overlay browser-back sentinel missing');
assert(modal.includes("global.addEventListener('popstate'"), 'browser back overlay handler missing');
assert(modal.includes('event.foxbearOverlayHandled = true'), 'overlay popstate consumption marker missing');
assert(modal.includes("requestCloseLayer(topLayer, 'browser-back')"), 'browser back must close the top overlay');
assert(modal.includes('function findContainingLayer'), 'nested external overlay parent detection missing');
assert(modal.includes('parentLayer'), 'nested external overlay ownership missing');
assert(modal.includes("layer.dataset.foxbearOverlaySuspended = 'true'"), 'nested external parent suspension missing');
assert(modal.includes('onRequestClose'), 'external overlay close contract missing');
assert(overlayCss.includes("[data-foxbear-overlay-suspended='true']"), 'fallback input block for suspended overlays missing');
assert(siteGuards.includes('event?.foxbearOverlayHandled === true || overlayOpen'), 'navigation exit guard must ignore overlay-consumed Back events');

assert(!reporter.includes('audioData') && !reporter.includes('localPath') && !recoveryPolicy.includes('audioData') && !recoveryPolicy.includes('localPath'), 'incident UI must not add audio or local path fields');
console.log('PASS v1.6.16 same-origin incident recovery and overlay back navigation');

// Runtime contract: one history sentinel closes the top dialog, resumes its
// parent, and re-arms Back while another blocking layer remains.
const vm = require('vm');
function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    toggle: (name, force) => {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
      return values.has(name);
    },
    contains: name => values.has(name),
    [Symbol.iterator]: function* () { yield* values; }
  };
}
function makeStyle() {
  const values = new Map();
  return {
    position: '', top: '', left: '', right: '', width: '', overflow: '', touchAction: '',
    setProperty: (key, value) => values.set(key, String(value)),
    removeProperty: key => values.delete(key)
  };
}
const body = { style: makeStyle(), dataset: {}, classList: makeClassList(), scrollTop: 0, contains: () => true };
const documentElement = { style: makeStyle(), scrollTop: 0, clientWidth: 390, clientHeight: 760 };
const fakeDocument = { body, documentElement, activeElement: body, querySelector: () => null };
const listeners = new Map();
const historyCalls = [];
const sandbox = {
  console,
  document: fakeDocument,
  innerWidth: 390,
  innerHeight: 760,
  scrollY: 0,
  location: { href: 'https://example.test/' },
  history: {
    state: {},
    pushState(state) { this.state = state; historyCalls.push('push'); },
    back() { historyCalls.push('back'); }
  },
  addEventListener(type, listener) { listeners.set(type, listener); },
  setTimeout(fn) { return 1; },
  clearTimeout() {},
  scrollTo() {},
  getComputedStyle: () => ({ display: 'block', visibility: 'visible' })
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(modal, sandbox);

function makeElement(name, parent = null) {
  const attributes = new Map([['role', 'dialog']]);
  const element = {
    nodeType: 1,
    name,
    ownerDocument: fakeDocument,
    hidden: false,
    isConnected: true,
    inert: false,
    style: makeStyle(),
    dataset: {},
    classList: makeClassList(['test-dialog']),
    firstElementChild: null,
    parent,
    contains(target) {
      for (let current = target; current; current = current.parent) if (current === this) return true;
      return false;
    },
    matches: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    setAttribute(key, value) { attributes.set(key, String(value)); },
    getAttribute(key) { return attributes.get(key) || null; }
  };
  return element;
}
const overlayApi = sandbox.FoxBearModalStateMachine;
const parent = makeElement('parent');
const opener = makeElement('opener', parent);
const child = makeElement('child');
let parentClosed = 0;
let childClosed = 0;
overlayApi.setExternalLayerOpen(parent, true, {
  mode: 'dialog', panel: parent,
  onRequestClose: () => { parentClosed += 1; overlayApi.setExternalLayerOpen(parent, false); }
});
overlayApi.setExternalLayerOpen(child, true, {
  mode: 'dialog', panel: child, opener,
  onRequestClose: () => { childClosed += 1; overlayApi.setExternalLayerOpen(child, false); }
});
assert.strictEqual(parent.dataset.foxbearOverlaySuspended, 'true', 'nested child must suspend parent input');
assert.strictEqual(parent.inert, true, 'native inert must be used when supported');
assert.strictEqual(historyCalls.filter(value => value === 'push').length, 1, 'one shared history sentinel should cover nested dialogs');
listeners.get('popstate')();
assert.strictEqual(childClosed, 1, 'first Back must close the top child dialog');
assert.strictEqual(parentClosed, 0, 'first Back must preserve the parent dialog');
assert.strictEqual(parent.inert, false, 'parent must resume after child close');
assert.strictEqual(historyCalls.filter(value => value === 'push').length, 2, 'remaining parent must re-arm the history sentinel');
listeners.get('popstate')();
assert.strictEqual(parentClosed, 1, 'second Back must close the remaining parent dialog');
assert.strictEqual(overlayApi.getOpenLayerCount(), 0, 'all dialog layers should be closed after two Back actions');
