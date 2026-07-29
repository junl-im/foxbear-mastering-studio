'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const uiSource = fs.readFileSync(path.join(root, 'src/boot/ui-shell-recovery-service.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'src/boot/runtime-health.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const assetVersion = pkg.foxbearRelease.assetVersion;

assert(uiSource.includes('REQUIRED_SCRIPTS'), 'critical script inventory is missing');
assert(uiSource.includes('missingScriptRecoveries'), 'script recovery diagnostics are missing');
assert(uiSource.includes('critical-scripts-missing'), 'script-specific user recovery state is missing');
assert(runtimeSource.includes('scriptsMissing'), 'Runtime Health does not include script recovery state');

function makeClassList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach(item => values.add(item)),
    remove: (...items) => items.forEach(item => values.delete(item)),
    toggle(item, force) { if (force) values.add(item); else values.delete(item); },
    contains: item => values.has(item)
  };
}

const listeners = new Map();
function addListener(type, fn) {
  const list = listeners.get(type) || [];
  list.push(fn);
  listeners.set(type, list);
}
function dispatch(type, event = {}) {
  for (const fn of listeners.get(type) || []) fn(event);
}

const links = ['theme.css', 'layout.css', 'studio.css'].map(name => ({
  tagName: 'LINK',
  href: `https://example.test/assets/css/${name}?v=${assetVersion}`,
  dataset: {},
  sheet: {},
  getAttribute(key) { return key === 'href' ? `assets/css/${name}?v=${assetVersion}` : null; }
}));
const scriptNames = [
  'src/config/build-info.js',
  'src/boot/runtime-health.js',
  'src/boot/service-worker-update-service.js',
  'src/app.js'
];
const scripts = scriptNames.map(name => ({
  tagName: 'SCRIPT',
  src: `https://example.test/${name}?v=${assetVersion}`,
  dataset: {},
  getAttribute(key) { return key === 'src' ? `${name}?v=${assetVersion}` : null; }
}));
const shell = {
  hidden: false,
  style: { display: '', visibility: '', opacity: '', removeProperty(name) { this[name] = ''; } },
  attrs: new Map(),
  setAttribute(key, value) { this.attrs.set(key, String(value)); },
  getAttribute(key) { return this.attrs.get(key) || null; },
  removeAttribute(key) { this.attrs.delete(key); },
  hasAttribute(key) { return this.attrs.has(key); },
  getBoundingClientRect() { return { width: 900, height: 640 }; }
};
const html = { classList: makeClassList() };
const body = {
  classList: makeClassList(),
  children: [],
  appendChild(node) { node.parentNode = this; this.children.push(node); }
};
const document = {
  readyState: 'interactive',
  documentElement: html,
  body,
  querySelector(selector) {
    if (selector === '.app-shell') return shell;
    if (selector === '.runtime-recovery-panel') return null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector.includes('link[rel="stylesheet"]')) return links;
    if (selector.includes('script[src]')) return scripts;
    return [];
  },
  getElementById(id) { return body.children.find(node => node.id === id) || null; },
  createElement() {
    return {
      hidden: false,
      id: '', className: '', textContent: '', attrs: new Map(),
      setAttribute(key, value) { this.attrs.set(key, String(value)); },
      remove() { body.children = body.children.filter(node => node !== this); }
    };
  },
  addEventListener: addListener
};
const sandbox = {
  console, document, Date, Object, Array, String, Number, Boolean, Set, Map,
  FoxBearBuildInfo: { assetVersion },
  CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
  getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; },
  addEventListener: addListener,
  dispatchEvent(event) { dispatch(event.type, event); },
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(uiSource, sandbox, { filename: 'ui-shell-recovery-service.js' });

dispatch('DOMContentLoaded', { target: document });
let snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.scriptsPending, true, 'critical scripts should remain pending before window load');
assert.strictEqual(snapshot.scriptsMissing, false, 'pending scripts must not be reported as failed');

const failedApp = scripts.find(script => script.src.includes('/src/app.js'));
failedApp.dataset.foxbearLoadError = 'true';
dispatch('error', { target: failedApp });
dispatch('load', { target: sandbox });
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.active, true, 'critical script failure should activate recovery state');
assert.strictEqual(snapshot.scriptsMissing, true, 'critical script failure should be diagnosed');
assert.strictEqual(snapshot.stylesMissing, false, 'script failure must not be mislabeled as style failure');
assert(snapshot.missingScriptRecoveries >= 1, 'script recovery counter should increment');
const notice = body.children.find(node => node.id === 'foxbearUiShellRecoveryNotice');
assert(notice && notice.textContent.includes('핵심 기능'), 'script failure should show a specific recovery notice');
assert(html.classList.contains('foxbear-ui-shell-scripts-missing'), 'script degraded class should be active');

failedApp.dataset.foxbearLoadError = 'false';
failedApp.dataset.foxbearLoadComplete = 'true';
dispatch('load', { target: failedApp });
sandbox.FoxBearUiShellRecoveryService.recover('script-restored');
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.scriptsMissing, false, 'restored script should clear failure state');
assert.strictEqual(snapshot.active, false, 'restored script should resolve recovery mode');
assert(!html.classList.contains('foxbear-ui-shell-scripts-missing'), 'script degraded class should be removed');

console.log('PASS v1.6.39 partial critical-script recovery and Runtime Health contract');
