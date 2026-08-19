#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const appSource = read('src/app.js');
const bridgeSource = read('src/boot/pwa-runtime-bridge.js');
const loaderSource = read('src/ui/admin-incident-loader-service.js');
const swSource = read('sw.js');
const indexSource = read('index.html');

assert(!indexSource.includes('assets/css/components/admin-incident-monitor.css'), 'admin incident CSS must not remain render-blocking in index.html');
assert(!swSource.includes("'./assets/css/components/admin-incident-monitor.css"), 'admin-only CSS must not be background-warmed before admin use');
assert(appSource.includes('styleSrc: lazy.stylePath') && appSource.includes('styleIntegrity: lazy.styleIntegrity'), 'admin lazy loader must receive stylesheet URL and SRI');
assert(appSource.includes('if (visible) ensureAdminIncidentMonitorStyle()'), 'verified administrators should preload shared monitor CSS before opening the visits dialog');
assert(appSource.includes('isWarmCacheSafe: () => !state.busy') && appSource.includes("['analyzing', 'processing'].includes(track.status)"), 'service-worker warming must be gated away from audio work');
assert(appSource.includes('if (!workflow?.renderExportFileNameSummary || !policy)') && !appSource.includes('function renderExportFileNameSummary() { return getFileNameWorkflowService()'), 'filename summary render must fail soft when optional modules are missing');
assert(appSource.includes('function renderDetail(options = {}) { const view = window.FoxBearDetailView; if (!view?.renderDetail)'), 'detail render must fail soft when the optional view module is missing');
assert(appSource.split(/\r?\n/).length < 13250, 'app.js architecture headroom regressed');

function makeLoaderNode(type) {
  const listeners = new Map();
  return {
    type,
    dataset: {},
    removed: false,
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    dispatch(name) { listeners.get(name)?.({ type: name }); },
    remove() { this.removed = true; }
  };
}

async function verifyAdminCssLazyLoad() {
  const appended = [];
  const document = {
    head: { appendChild(node) { appended.push(node); } },
    createElement(type) { return makeLoaderNode(type); },
    querySelector(selector) {
      if (selector.startsWith('link')) return appended.find(node => node.type === 'link' && !node.removed) || null;
      if (selector.startsWith('script')) return appended.find(node => node.type === 'script' && !node.removed) || null;
      return null;
    }
  };
  const sandbox = { console, Promise, Map, Object, String, Number, Boolean, Math, document, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(loaderSource, sandbox, { filename: 'admin-incident-loader-service.js' });
  const service = sandbox.FoxBearAdminIncidentLoaderService;
  const loadPromise = service.load({
    document,
    styleSrc: 'assets/css/components/admin-incident-monitor.css?v=test',
    styleIntegrity: 'sha384-style',
    src: 'src/ui/admin-incident-monitor-view.js?v=test',
    integrity: 'sha384-script',
    resolveScriptUrl: value => `https://example.test/${value}`,
    isReady: () => Boolean(sandbox.FoxBearAdminIncidentMonitorView?.create),
    timeoutMs: 5000
  });
  assert.strictEqual(appended.length, 1, 'admin CSS must be requested before the heavy admin view script');
  const link = appended[0];
  assert.strictEqual(link.type, 'link');
  assert.strictEqual(link.rel, 'stylesheet');
  assert.strictEqual(link.integrity, 'sha384-style');
  assert.strictEqual(link.crossOrigin, 'anonymous');
  link.dispatch('load');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(appended.length, 2, 'admin script should start after its stylesheet settles');
  const script = appended[1];
  assert.strictEqual(script.type, 'script');
  assert.strictEqual(script.integrity, 'sha384-script');
  assert.strictEqual(script.crossOrigin, 'anonymous');
  sandbox.FoxBearAdminIncidentMonitorView = { create() {} };
  script.dispatch('load');
  const result = await loadPromise;
  assert.strictEqual(result.ready, true);
  const reused = await service.load({ document, styleSrc: 'assets/css/components/admin-incident-monitor.css?v=test', isReady: () => true });
  assert.strictEqual(reused.reused, true, 'ready admin assets should be reused without a new request');
  assert.strictEqual(appended.length, 2, 'ready admin assets must not append duplicate nodes');
}

function createBridgeSandbox() {
  const sandbox = { console, Promise, Object, String, Boolean, Number, Math, URL };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(bridgeSource, sandbox, { filename: 'pwa-runtime-bridge.js' });
  return sandbox;
}

async function verifyDeferredWarmScheduling() {
  const sandbox = createBridgeSandbox();
  const idle = [];
  const timers = [];
  const messages = [];
  let safe = false;
  const worker = { postMessage(message) { messages.push(message); } };
  const bridge = sandbox.FoxBearPwaRuntimeBridge.createBridge({
    navigator: { onLine: true, connection: { saveData: false, effectiveType: '4g' } },
    document: { visibilityState: 'visible', hidden: false },
    requestIdleCallback(fn, options) { idle.push({ fn, options }); return idle.length; },
    setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; },
    isWarmCacheSafe: () => safe
  });
  assert.strictEqual(bridge.scheduleWarmCache(worker), true, 'healthy connection should schedule warm cache');
  assert.strictEqual(messages.length, 0, 'warm cache must not post before idle');
  assert.strictEqual(idle[0].options.timeout, 8000, 'idle warm should have a bounded timeout');
  idle.shift().fn();
  assert.strictEqual(messages.length, 0, 'busy audio state must defer warm cache');
  const retry = timers.find(item => item.ms === 4000);
  assert(retry, 'busy warm attempt must schedule a bounded retry');
  safe = true;
  retry.fn();
  assert.strictEqual(idle.length, 1, 'safe retry must return to idle scheduling');
  idle.shift().fn();
  assert.deepStrictEqual(messages.map(item => item.type), ['FOXBEAR_WARM_CACHE']);
  assert.strictEqual(bridge.scheduleWarmCache(worker), false, 'warm cache should only be posted once per page bridge');

  const slowSandbox = createBridgeSandbox();
  const slowIdle = [];
  const slowBridge = slowSandbox.FoxBearPwaRuntimeBridge.createBridge({
    navigator: { onLine: true, connection: { saveData: true, effectiveType: '4g' } },
    requestIdleCallback(fn) { slowIdle.push(fn); }
  });
  assert.strictEqual(slowBridge.scheduleWarmCache(worker), false, 'Save-Data must suppress background warm cache');
  assert.strictEqual(slowIdle.length, 0);
  const twoGBridge = slowSandbox.FoxBearPwaRuntimeBridge.createBridge({ navigator: { onLine: true, connection: { effectiveType: '2g' } } });
  assert.strictEqual(twoGBridge.scheduleWarmCache(worker), false, '2G connections must suppress background warm cache');
}

async function verifyWarmGraph() {
  const listeners = new Map();
  const entries = new Map();
  let activeFetches = 0;
  let maxActiveFetches = 0;
  const cache = {
    async match(key) { return entries.get(String(key)) || null; },
    async put(key, response) { entries.set(String(key), response); },
    async addAll() {}
  };
  const context = {
    console, URL, Set, Map, Promise, Math, Date, String,
    Response: { error: () => ({ ok: false, status: 0 }) },
    indexedDB: {},
    caches: { async open() { return cache; }, async keys() { return []; }, async delete() { return true; } },
    fetch: async asset => {
      activeFetches += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      await new Promise(resolve => setTimeout(resolve, 1));
      activeFetches -= 1;
      return { ok: true, status: 200, clone() { return this; } };
    },
    setTimeout, clearTimeout,
    self: {
      location: { origin: 'https://foxbear.example' },
      registration: { scope: 'https://foxbear.example/', navigationPreload: null },
      clients: { async claim() {} },
      async skipWaiting() {},
      addEventListener(type, handler) { listeners.set(type, handler); }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(`${swSource}\n;globalThis.__warm = { WARM_ASSETS, WARM_CACHE_CONCURRENCY, warmFoxBearCoreCache };`, context, { filename: 'sw.js' });
  const api = context.__warm;
  assert.strictEqual(api.WARM_CACHE_CONCURRENCY, 3, 'background warm concurrency must remain capped at three');
  const canonical = api.WARM_ASSETS.map(asset => String(asset).split(/[?#]/, 1)[0]);
  assert.strictEqual(new Set(canonical).size, canonical.length, 'warm graph must not fetch versioned/unversioned duplicates of the same asset');
  assert(!api.WARM_ASSETS.some(asset => String(asset).includes('admin-incident-monitor.css')), 'admin-only CSS must stay outside the warm graph');
  const result = await api.warmFoxBearCoreCache({ force: true });
  assert.strictEqual(result.failed, 0);
  assert(maxActiveFetches <= 3, `warm fetch concurrency exceeded budget: ${maxActiveFetches}`);
}

Promise.all([verifyAdminCssLazyLoad(), verifyDeferredWarmScheduling(), verifyWarmGraph()])
  .then(() => console.log('PASS v1.6.107 boot payload phase1: deferred warm cache, deduped/limited SW warm graph, lazy admin CSS, and fail-soft optional render modules'))
  .catch(error => { console.error(error); process.exit(1); });
