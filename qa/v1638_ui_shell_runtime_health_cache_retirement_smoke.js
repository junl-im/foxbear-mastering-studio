#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const assetVersion = pkg.foxbearRelease.assetVersion;
const cacheName = pkg.foxbearRelease.cacheName;
const uiSource = read('src/boot/ui-shell-recovery-service.js');
const runtimeSource = read('src/boot/runtime-health.js');
const updateSource = read('src/boot/service-worker-update-service.js');
const swSource = read('sw.js');
const css = read('assets/css/boot/ui-shell-recovery.css');

assert(runtimeSource.includes('getUiShellRecoverySnapshot'), 'runtime health must collect UI shell recovery state');
assert(runtimeSource.includes("foxbear:runtime-recovery-panel"), 'runtime health must publish recovery panel visibility');
assert(runtimeSource.includes('app-ready-degraded'), 'app-ready must preserve a degraded recovery panel');
assert(css.includes('.foxbear-ui-shell-recovery-notice[hidden]'), 'hidden recovery notices must not occupy the UI');
assert(swSource.includes('queryActiveClientShellVersions'), 'service worker client shell probing is missing');
assert(swSource.includes('FOXBEAR_QUERY_CLIENT_SHELL_STATE'), 'service worker shell query contract is missing');
assert(swSource.includes('protectedNames'), 'active client cache protection is missing');
assert(updateSource.includes('FOXBEAR_CLIENT_SHELL_STATE'), 'page shell-state response is missing');
assert(updateSource.includes('clientShellQueryCount'), 'page shell-state diagnostics are missing');

function classList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach(item => values.add(item)),
    remove: (...items) => items.forEach(item => values.delete(item)),
    toggle(item, force) { if (force) values.add(item); else values.delete(item); },
    contains: item => values.has(item)
  };
}

const listeners = new Map();
const addListener = (type, fn) => {
  const list = listeners.get(type) || [];
  list.push(fn);
  listeners.set(type, list);
};
const dispatch = (type, event = {}) => (listeners.get(type) || []).forEach(fn => fn(event));
const links = ['theme.css', 'layout.css', 'studio.css'].map(name => ({
  tagName: 'LINK',
  href: `https://example.test/assets/css/${name}?v=${assetVersion}`,
  dataset: {},
  sheet: null,
  getAttribute(key) { return key === 'href' ? `assets/css/${name}?v=${assetVersion}` : null; }
}));
const scripts = [
  'src/config/build-info.js',
  'src/boot/runtime-health.js',
  'src/boot/service-worker-update-service.js',
  'src/app.js'
].map(name => ({
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
  getBoundingClientRect() { return { width: 900, height: 700 }; }
};
const html = { classList: classList() };
const body = {
  classList: classList(),
  children: [],
  appendChild(node) { node.parentNode = this; this.children.push(node); },
  querySelector(selector) {
    if (selector === '.runtime-recovery-panel') return this.runtimePanel || null;
    return null;
  }
};
const document = {
  readyState: 'interactive',
  documentElement: html,
  body,
  querySelector(selector) {
    if (selector === '.app-shell') return shell;
    if (selector === '.runtime-recovery-panel') return body.runtimePanel || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector.includes('stylesheet')) return links;
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
const uiSandbox = {
  console, document, Date, Object, Array, String, Number, Boolean, Set, Map,
  FoxBearBuildInfo: { assetVersion },
  CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
  getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; },
  addEventListener: addListener,
  dispatchEvent(event) { dispatch(event.type, event); },
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {}
};
uiSandbox.window = uiSandbox;
uiSandbox.globalThis = uiSandbox;
vm.createContext(uiSandbox);
vm.runInContext(uiSource, uiSandbox, { filename: 'ui-shell-recovery-service.js' });
dispatch('DOMContentLoaded', { target: document });
let snapshot = uiSandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.stylesPending, true, 'loading styles should be pending before window load');
assert.strictEqual(snapshot.stylesMissing, false, 'pending styles must not be reported as failed early');
assert.strictEqual(body.children.length, 0, 'pending styles must not display a false recovery notice');

links[0].dataset.foxbearLoadError = 'true';
dispatch('error', { target: links[0] });
dispatch('load', { target: uiSandbox });
snapshot = uiSandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.active, true, 'failed core style should activate safe UI');
assert.strictEqual(snapshot.stylesMissing, true, 'failed core style should be diagnosed');
assert(body.children.some(node => node.id === 'foxbearUiShellRecoveryNotice'), 'safe UI notice should be visible without runtime panel');

dispatch('foxbear:runtime-recovery-panel', { detail: { visible: true } });
snapshot = uiSandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.runtimePanelVisible, true, 'runtime panel visibility should reach shell recovery');
assert.strictEqual(snapshot.noticeVisible, false, 'runtime panel should suppress the duplicate shell notice');
assert(snapshot.noticeSuppressedCount >= 1, 'notice suppression should be diagnosed');

links.forEach(link => { link.sheet = {}; delete link.dataset.foxbearLoadError; });
dispatch('load', { target: links[0] });
uiSandbox.FoxBearUiShellRecoveryService.recover('styles-restored');
snapshot = uiSandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.active, false, 'restored styles should resolve safe UI mode');
assert.strictEqual(snapshot.stylesMissing, false, 'restored styles should clear missing state');
assert(!html.classList.contains('foxbear-ui-shell-styles-missing'), 'fallback class should be removed after recovery');

const swListeners = new Map();
const controllerMessages = [];
const swController = { postMessage(payload) { controllerMessages.push(payload); } };
const storage = new Map();
const updateSandbox = {
  console, Date, Math, Object, Array, String, Number, Boolean, Set, Map, WeakSet, WeakMap,
  document: { visibilityState: 'visible', querySelectorAll: () => [], addEventListener() {} },
  navigator: { serviceWorker: { controller: swController, addEventListener(type, fn) { swListeners.set(type, fn); } } },
  FoxBearBuildInfo: { assetVersion, cacheName },
  localStorage: {
    get length() { return storage.size; },
    key(index) { return Array.from(storage.keys())[index] || null; },
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  addEventListener() {},
  setTimeout(fn) { fn(); return 1; }, clearTimeout() {},
  setInterval() { return 1; }, clearInterval() {}
};
updateSandbox.window = updateSandbox;
updateSandbox.globalThis = updateSandbox;
vm.createContext(updateSandbox);
vm.runInContext(updateSource, updateSandbox, { filename: 'service-worker-update-service.js' });
assert(controllerMessages.some(item => item.type === 'FOXBEAR_CLIENT_SHELL_STATE' && item.assetVersion === assetVersion), 'page must announce its shell generation');
const queryReplies = [];
swListeners.get('message')?.({
  data: { type: 'FOXBEAR_QUERY_CLIENT_SHELL_STATE', requestId: 'probe-1' },
  source: { postMessage(payload) { queryReplies.push(payload); } }
});
assert(queryReplies.some(item => item.requestId === 'probe-1' && item.assetVersion === assetVersion), 'page must answer shell generation probes');
assert(updateSandbox.FoxBearServiceWorkerUpdateService.getSnapshot().clientShellQueryCount >= 1, 'shell query response must be diagnosed');

(async () => {
  const serviceWorkerListeners = new Map();
  const cacheNames = new Set([
    cacheName,
    'foxbear-shell-v1.6.35-history-terminal-race-sw-activation-lease',
    'foxbear-shell-v1.6.36-sw-activation-generation-fencing-resource-stress',
    'foxbear-shell-v1.6.42-spark-google-admin-auth'
  ]);
  const deleted = [];
  const client = {
    id: 'client-current',
    postMessage(payload) {
      if (payload.type !== 'FOXBEAR_QUERY_CLIENT_SHELL_STATE') return;
      serviceWorkerListeners.get('message')?.({
        data: { type: 'FOXBEAR_CLIENT_SHELL_STATE', requestId: payload.requestId, assetVersion, cacheName, active: true, updatedAt: Date.now() },
        source: client,
        waitUntil() {}
      });
    }
  };
  const swSandbox = {
    console, URL, Date, Math, Object, Array, String, Number, Boolean, Set, Map, Promise,
    setTimeout, clearTimeout,
    caches: {
      async keys() { return Array.from(cacheNames); },
      async delete(name) { deleted.push(name); return cacheNames.delete(name); },
      async open() { return { addAll: async () => {}, match: async () => null, put: async () => {} }; }
    },
    fetch: async () => null,
    Response: { error: () => ({ error: true }), redirect: () => ({ redirect: true }) },
    indexedDB: { open() { return {}; } },
    self: {
      location: { origin: 'https://example.test' },
      registration: { scope: 'https://example.test/', navigationPreload: { enable: async () => {} } },
      clients: { matchAll: async () => [client], claim: async () => {} },
      addEventListener(type, fn) { serviceWorkerListeners.set(type, fn); },
      skipWaiting() {}
    }
  };
  swSandbox.globalThis = swSandbox.self;
  vm.createContext(swSandbox);
  vm.runInContext(swSource, swSandbox, { filename: 'sw.js' });
  await vm.runInContext("purgeLegacyShellCaches({ probeClients: true, reason: 'qa' })", swSandbox);
  assert(deleted.includes('foxbear-shell-v1.6.35-history-terminal-race-sw-activation-lease'), 'obsolete shell cache should be removed');
  assert(deleted.includes('foxbear-shell-v1.6.36-sw-activation-generation-fencing-resource-stress'), 'inactive optional retained shell should retire after complete client probe');
  assert(!deleted.includes('foxbear-shell-v1.6.42-spark-google-admin-auth'), 'latest rollback shell must remain available');
  assert(!deleted.includes(cacheName), 'current shell cache must remain available');
  console.log('PASS v1.6.38 UI shell, runtime health, and client-aware cache retirement');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
