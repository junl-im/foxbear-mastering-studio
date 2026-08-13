'use strict';
const fs = require('fs');
const assert = require('assert');

const sw = fs.readFileSync('sw.js', 'utf8');
const spec = fs.readFileSync('qa/browser/pwa-back-wakelock-sw-playwright.spec.js', 'utf8');
const current = sw.match(/const CACHE_NAME = '([^']+)'/)?.[1] || '';

assert(current.includes('foxbear-shell-v1.6.94'));
assert(!spec.includes('LEGACY_CACHE_BLOCK'));
assert(!spec.includes('E2E_RECOVERY_CACHE'));
assert(spec.includes("const activeCacheName = String(warmed.cacheName || '')"));
assert(spec.includes('expect(repeated.cacheName).toBe(activeCacheName)'));
assert(spec.includes('await cache.delete(url)'));
assert(!spec.includes('caches.delete(cacheName)'));
console.log('v1.5.50 PWA current-cache recovery smoke: PASS');
