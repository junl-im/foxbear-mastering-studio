#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getReleaseMetadata } = require('../tools/release-metadata');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pwaSpec = read('qa/browser/pwa-back-wakelock-sw-playwright.spec.js');
const swSource = read('sw.js');
const meta = getReleaseMetadata();

assert(!pwaSpec.includes('E2E_RECOVERY_CACHE'), 'browser QA must not select a legacy cache for offline recovery');
assert(!pwaSpec.includes('LEGACY_CACHE_BLOCK'), 'browser QA must not parse the legacy cache list');
assert(pwaSpec.includes("const activeCacheName = String(warmed.cacheName || '')"), 'browser QA must use the cache name reported by the active worker');
assert(pwaSpec.includes('expect(repeated.cacheName).toBe(activeCacheName)'), 'repeated warm must stay on the same active cache generation');
assert(pwaSpec.includes('await cache.delete(url)'), 'offline probe cleanup must delete only the probe entry');
assert(!pwaSpec.includes('caches.delete(cacheName)'), 'browser QA must never delete the active shell cache during probe cleanup');

class FakeCache {
  constructor() { this.entries = new Map(); }
  key(request) { return typeof request === 'string' ? request : String(request?.url || request); }
  async match(request) { return this.entries.get(this.key(request)) || null; }
  async put(request, response) { this.entries.set(this.key(request), response); }
  async delete(request) { return this.entries.delete(this.key(request)); }
  async addAll() {}
}

const cacheMap = new Map();
const cachesStub = {
  async open(name) {
    if (!cacheMap.has(name)) cacheMap.set(name, new FakeCache());
    return cacheMap.get(name);
  },
  async keys() { return [...cacheMap.keys()]; },
  async delete(name) { return cacheMap.delete(name); }
};
const handlers = {};
const context = {
  self: {
    location: { origin: 'https://foxbear.invalid' },
    registration: { scope: 'https://foxbear.invalid/', navigationPreload: null },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener(type, handler) { handlers[type] = handler; }
  },
  caches: cachesStub,
  fetch: async () => { throw new Error('offline'); },
  indexedDB: {},
  Request,
  Response,
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
  console
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(`${swSource}\n;globalThis.__foxbearV1550 = { CACHE_NAME, staleWhileRevalidate };`, context, { filename: 'sw.js' });

(async () => {
  const { CACHE_NAME, staleWhileRevalidate } = context.__foxbearV1550;
  assert.strictEqual(CACHE_NAME, meta.cacheName, 'service-worker current cache metadata mismatch');
  const legacyMatch = swSource.match(/const LEGACY_CACHE_NAMES = \[([^\]]*)\];/);
  const legacyNames = [...String(legacyMatch?.[1] || '').matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert(!legacyNames.includes(CACHE_NAME), 'current cache must not be listed as legacy');

  const probeUrl = 'https://foxbear.invalid/__foxbear-current-cache-probe__.txt';
  const currentCache = await cachesStub.open(CACHE_NAME);
  const legacyCache = await cachesStub.open(legacyNames.at(-1));
  await currentCache.put(probeUrl, new Response('current-generation-ok', { status: 200 }));
  await legacyCache.put(probeUrl, new Response('legacy-generation-must-not-win', { status: 200 }));

  const recovered = await staleWhileRevalidate(new Request(probeUrl));
  assert.strictEqual(await recovered.text(), 'current-generation-ok', 'offline recovery did not use the current cache generation');

  await currentCache.delete(probeUrl);
  const missingCurrent = await staleWhileRevalidate(new Request(probeUrl));
  assert.strictEqual(missingCurrent.type, 'error', 'legacy cache must not be used when current-generation entry is absent');
  assert(await legacyCache.match(probeUrl), 'legacy fixture unexpectedly disappeared');

  console.log('PASS v1.5.50 current-cache offline recovery and probe cleanup');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
