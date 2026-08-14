#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { getReleaseMetadata } = require('../tools/release-metadata');
const { cleanupStaleServerProbes } = require('./browser/helpers/foxbear-e2e-helpers');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const meta = getReleaseMetadata();
const app = read('src/app.js');
const css = read('assets/css/header-command-bar.css');
const swSource = read('sw.js');
const playbackSource = read('src/audio/playback-link-service.js');
const runtimeSpec = read('qa/browser/runtime-health-playwright.spec.js');
const previewSpec = read('qa/browser/preview-translation-playback-playwright.spec.js');
const pwaSpec = read('qa/browser/pwa-back-wakelock-sw-playwright.spec.js');
const archiveHygiene = read('tools/archive-hygiene.js');
const releaseScript = read('tools/create-release-zip.sh');
const overwriteScript = read('tools/create-overwrite-zip.sh');

assert(css.includes('@media (max-width: 360px)') && css.includes('.brand-command-studio') && css.includes('display: none !important'), '320px header priority rule missing');
assert(runtimeSpec.includes('width: 320') && runtimeSpec.includes('studioDisplay') && runtimeSpec.includes('leftOverflow'), 'real-browser 320px header contract missing');
assert(app.includes('function releaseTrackResourcesSafely') && app.includes('clearBottomPreviewPlayer();') && app.includes('state.bottomPreviewTransport = null'), 'queue/preview resource cleanup is incomplete');
assert(previewSpec.includes('stressModes') && previewSpec.includes('PlaybackLinkService?.getDiagnostics') && previewSpec.includes('AudioContextManager?.getDiagnostics'), 'long-switch and lifecycle browser contract missing');
assert(read('src/audio/preview-translation-service.js').includes('global.FoxBearAudioContextManager || global.FoxBearAudioContexts') && read('src/audio/preview-translation-service.js').includes('pruneDisconnected') && read('src/audio/preview-translation-service.js').includes('activeControllers.delete(controller)'), 'preview translation AudioContext lifecycle cleanup missing');
assert(swSource.includes('purgeLegacyShellCaches') && swSource.includes('currentCachedMatch') && !swSource.includes('matchFoxBearRecoveryCache'), 'service-worker current-generation offline recovery and stale-shell purge missing');
assert(pwaSpec.includes('foxbear-offline-recovery-ok') && pwaSpec.includes('context.setOffline(true)'), 'real-browser offline recovery probe missing');
assert(archiveHygiene.includes("'__pycache__'") && archiveHygiene.includes('pyc|pyo') && releaseScript.includes("'*.pyc'") && overwriteScript.includes("-name '__pycache__'"), 'Python bytecode archive hygiene missing');

class FakeClassList { toggle() {} add() {} remove() {} contains() { return false; } }
class FakeShell {
  constructor() { this.dataset = {}; this.classList = new FakeClassList(); }
  querySelector() { return null; }
  appendChild() {}
}
class FakeAudio {
  constructor(shell) {
    this.shell = shell;
    this.dataset = {};
    this.listeners = new Map();
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.duration = 10;
    this.readyState = 4;
    this.isConnected = true;
  }
  closest() { return this.shell; }
  addEventListener(type, handler) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(handler); }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  pause() { this.paused = true; }
  listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}
const documentStub = { querySelectorAll: () => [] };
const playbackWindow = { dispatchEvent() {} };
const playbackContext = {
  window: playbackWindow,
  document: documentStub,
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  console,
  Date,
  Math,
  Number,
  Object,
  Array,
  String,
  Set,
  WeakMap
};
playbackWindow.document = documentStub;
vm.createContext(playbackContext);
vm.runInContext(playbackSource, playbackContext, { filename: 'playback-link-service.js' });
const playback = playbackWindow.FoxBearPlaybackLinkService;
const audioA = new FakeAudio(new FakeShell());
const audioB = new FakeAudio(new FakeShell());
playback.registerAudio(audioA, { role: 'bottom-dock' });
playback.registerAudio(audioB, { role: 'inline-preview' });
assert.strictEqual(playback.getDiagnostics().registeredCount, 2, 'playback registry did not register both audio elements');
assert(audioA.listenerCount() >= 5, 'playback listeners were not attached');
audioA.isConnected = false;
assert.strictEqual(playback.pruneDisconnected(), 1, 'detached audio was not pruned');
assert.strictEqual(audioA.listenerCount(), 0, 'detached audio listeners were not removed');
assert.strictEqual(playback.getDiagnostics().registeredCount, 1, 'detached audio remains strongly retained');
assert.strictEqual(playback.unregisterAudio(audioB, 'test-cleanup'), true, 'explicit unregister failed');
assert.strictEqual(audioB.listenerCount(), 0, 'explicit unregister did not remove listeners');
assert.strictEqual(playback.getDiagnostics().registeredCount, 0, 'playback registry did not return to zero');

class FakeCache {
  constructor() { this.entries = new Map(); }
  key(request) { return typeof request === 'string' ? request : String(request?.url || request); }
  async match(request) { return this.entries.get(this.key(request)) || null; }
  async put(request, response) { this.entries.set(this.key(request), response); }
  async addAll() {}
}
const cacheMap = new Map();
const deletedCaches = [];
const cachesStub = {
  async keys() { return [...cacheMap.keys()]; },
  async open(name) { if (!cacheMap.has(name)) cacheMap.set(name, new FakeCache()); return cacheMap.get(name); },
  async delete(name) { deletedCaches.push(name); return cacheMap.delete(name); }
};
const handlers = {};
const selfStub = {
  location: { origin: 'https://foxbear.invalid' },
  registration: { navigationPreload: { async enable() {} } },
  clients: {
    async claim() {},
    async matchAll() { return [{ id: 'legacy-open-client', postMessage() {} }]; }
  },
  async skipWaiting() {},
  addEventListener(type, handler) { handlers[type] = handler; }
};
const swContext = {
  self: selfStub,
  caches: cachesStub,
  fetch: async () => { throw new Error('offline'); },
  Response: { error: () => ({ error: true }) },
  URL,
  Set,
  Map,
  Promise,
  Object,
  Array,
  Math,
  Number,
  String,
  Date,
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {},
  console
};
vm.createContext(swContext);
vm.runInContext(swSource, swContext, { filename: 'sw.js' });
const legacyBlock = swSource.match(/const LEGACY_CACHE_NAMES = \[([\s\S]*?)\];/);
const legacy = [...String(legacyBlock?.[1] || '').matchAll(/'([^']+)'/g)].map(match => match[1]);
const newest = legacy.at(-1);
const secondNewest = legacy.at(-2);
const older = legacy.at(-3);
assert(newest && secondNewest && older, 'legacy cache fixture is incomplete');
cacheMap.set(meta.cacheName, new FakeCache());
cacheMap.set(newest, new FakeCache());
cacheMap.set(secondNewest, new FakeCache());
cacheMap.set(older, new FakeCache());
cacheMap.set('unrelated-cache', new FakeCache());
cacheMap.get(newest).entries.set('/recovery.js', { body: 'newest-recovery' });
cacheMap.get(secondNewest).entries.set('./index.html', { body: 'older-index' });
let activation;
handlers.activate({ waitUntil(promise) { activation = promise; } });

(async () => {
  await activation;
  assert(cacheMap.has(meta.cacheName), 'current cache was deleted during activation');
  assert(cacheMap.has(newest) && cacheMap.has(secondNewest) && cacheMap.has(older), 'an unresponsive legacy client must defer every shell-cache retirement until its generation is known');
  assert(!deletedCaches.includes(newest) && !deletedCaches.includes(secondNewest) && !deletedCaches.includes(older), 'incomplete client probing must not delete any legacy shell cache');
  assert(cacheMap.has('unrelated-cache'), 'unrelated cache must not be deleted');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-probe-cleanup-'));
  try {
    fs.writeFileSync(path.join(temp, '.foxbear-e2e-probe-11-22.txt'), 'stale');
    fs.writeFileSync(path.join(temp, '.foxbear-e2e-probe-33-44.txt'), 'stale');
    fs.writeFileSync(path.join(temp, 'keep.txt'), 'keep');
    assert.strictEqual(cleanupStaleServerProbes(temp), 2, 'stale E2E probe cleanup count mismatch');
    assert.deepStrictEqual(fs.readdirSync(temp), ['keep.txt'], 'stale E2E probe cleanup removed the wrong files');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  console.log('PASS v1.5.28 compact header, playback lifecycle, offline recovery, and E2E probe cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
