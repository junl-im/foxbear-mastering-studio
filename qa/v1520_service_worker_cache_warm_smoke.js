#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const swSource = read('sw.js');
const appSource = read('src/app.js');
const pwaRuntimeBridgeSource = read('src/boot/pwa-runtime-bridge.js');
const helpersSource = read('qa/browser/helpers/foxbear-e2e-helpers.js');
const pwaSpecSource = read('qa/browser/pwa-back-wakelock-sw-playwright.spec.js');

assert(appSource.includes('FoxBearPwaRuntimeBridge') && pwaRuntimeBridgeSource.includes("activeWorker && !global.__FOXBEAR_E2E__"), 'browser QA must skip automatic full cache warming');
assert(helpersSource.includes('async function warmServiceWorkerCache'), 'browser helpers must expose an explicit service-worker warm command');
assert(pwaSpecSource.includes('const repeated = await warmServiceWorkerCache(page)'), 'browser QA must verify repeated cache warming is idempotent');
assert(pwaSpecSource.includes('expect(repeated.cached).toBe(0)'), 'second cache warm must perform no downloads');
assert(swSource.includes('if (!force && await cache.match(asset))'), 'service worker must skip assets already present in the current cache');
assert(swSource.includes('alreadyCached'), 'service worker warm result must report cache hits');

const listeners = new Map();
const entries = new Map();
const fetched = [];
const cache = {
  async match(key) { return entries.get(String(key)) || null; },
  async put(key, response) { entries.set(String(key), response); }
};
const context = {
  console,
  URL,
  Set,
  Map,
  Promise,
  Math,
  Date,
  Response: { error: () => ({ ok: false, status: 0 }) },
  indexedDB: {},
  caches: {
    async open() { return cache; },
    async keys() { return []; },
    async delete() { return true; }
  },
  fetch: async asset => {
    fetched.push(String(asset));
    return { ok: true, status: 200, clone() { return this; } };
  },
  self: {
    location: { origin: 'https://foxbear.example' },
    registration: { scope: 'https://foxbear.example/', navigationPreload: null },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener(type, handler) { listeners.set(type, handler); }
  }
};
context.globalThis = context;
vm.runInNewContext(`${swSource}\n;globalThis.__foxbearWarmTest = { warmFoxBearCoreCache, WARM_ASSETS };`, context, { filename: 'sw.js' });

(async () => {
  const { warmFoxBearCoreCache, WARM_ASSETS } = context.__foxbearWarmTest;
  assert(Array.isArray(WARM_ASSETS) && WARM_ASSETS.length > 20, 'warm asset list must remain meaningful');

  entries.set(String(WARM_ASSETS[0]), { ok: true, status: 200 });
  const first = await warmFoxBearCoreCache();
  assert.strictEqual(first.total, WARM_ASSETS.length);
  assert.strictEqual(first.alreadyCached, 1);
  assert.strictEqual(first.cached, WARM_ASSETS.length - 1);
  assert.strictEqual(first.failed, 0);
  assert.strictEqual(fetched.length, WARM_ASSETS.length - 1);

  const beforeRepeat = fetched.length;
  const repeated = await warmFoxBearCoreCache();
  assert.strictEqual(repeated.cached, 0, 'repeated warm must not redownload cached assets');
  assert.strictEqual(repeated.alreadyCached, WARM_ASSETS.length);
  assert.strictEqual(repeated.failed, 0);
  assert.strictEqual(fetched.length, beforeRepeat, 'repeated warm must produce zero fetches');

  const forced = await warmFoxBearCoreCache({ force: true });
  assert.strictEqual(forced.cached, WARM_ASSETS.length);
  assert.strictEqual(forced.alreadyCached, 0);
  assert.strictEqual(forced.failed, 0);
  assert.strictEqual(fetched.length, beforeRepeat + WARM_ASSETS.length, 'forced warm must refresh every warm asset');

  console.log(`PASS v1.5.20 idempotent service-worker cache warm: ${WARM_ASSETS.length} warm assets`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
