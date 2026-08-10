#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL v1.5.5 update safety asset health smoke: ${message}`);
    process.exit(1);
  }
}
function sri(path) {
  return `sha384-${crypto.createHash('sha384').update(fs.readFileSync(path)).digest('base64')}`;
}

const index = read('index.html');
const sw = read('sw.js');
const runtimeHealth = read('src/boot/runtime-health.js');
const updateSafety = read('src/boot/update-safety-service.js');
const app = read('src/app.js');
const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');

const BOOT_KEY = ['h=boot-sri-v1685','h=boot-sri-v156','h=boot-sri-v155'].find(key => index.includes(key));
const UPDATE_KEY = ['h=update-safety-v1685','h=update-safety-v156','h=update-safety-v155'].find(key => index.includes(key));
assert(index.includes(`src/boot/runtime-health.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${BOOT_KEY}`), 'runtime health boot key missing from index');
assert(index.includes(`src/boot/performance-diagnostics.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${BOOT_KEY}`), 'performance diagnostics boot key missing from index');
assert(index.includes(`src/app.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${BOOT_KEY}`), 'app boot key missing from index');
assert(index.includes(`src/boot/update-safety-service.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${UPDATE_KEY}`), 'update safety service missing from index');
assert(sw.includes(`./src/boot/update-safety-service.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${UPDATE_KEY}`), 'update safety service missing from service worker precache');
assert(sw.includes(`./src/boot/runtime-health.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${BOOT_KEY}`), 'runtime health boot key missing from service worker');
assert(sw.includes(`./src/boot/performance-diagnostics.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${BOOT_KEY}`), 'performance diagnostics boot key missing from service worker');
assert(sw.includes(`./src/app.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&${BOOT_KEY}`), 'app boot key missing from service worker');
assert(sw.includes("foxbear-shell-v1.5.5-update-safety") || sw.includes("foxbear-shell-v1.5.6-export-progress-recovery") || sw.includes("foxbear-shell-v1.6.85-browser-sentinel-ui-mode-header-recovery"), 'service worker cache generation should include v1.5.5+ generation');
assert(sw.includes("foxbear-shell-v1.5.4-boot-sri-recovery"), 'v1.5.4 cache name should be listed as legacy');
assert(sw.includes('FOXBEAR_PURGE_CACHES') && sw.includes('purgeFoxBearCaches'), 'service worker should expose purge cache message handler');
assert(sw.includes('networkFirstNoFallbackOnIntegrityAssets') && sw.includes("cache: hasPatchBust ? 'no-store' : 'default'"), 'patched JS/CSS assets should be fetched with no-store network-first handling');

assert(index.includes(sri('src/boot/runtime-health.js')), 'runtime health SRI does not match file bytes');
assert(index.includes(sri('src/boot/update-safety-service.js')), 'update safety SRI does not match file bytes');
assert(index.includes(sri('src/boot/performance-diagnostics.js')), 'performance diagnostics SRI does not match file bytes');
assert(index.includes(sri('src/app.js')), 'app SRI does not match file bytes');

assert(updateSafety.includes('FoxBearUpdateSafety') && updateSafety.includes('getAssetInventory') && updateSafety.includes('findBootKeyMismatches'), 'update safety global diagnostics are incomplete');
assert(['boot-sri-v155','boot-sri-v156','boot-sri-v1685'].some(key => updateSafety.includes(key)) && updateSafety.includes('foxbear:update-safety-risk'), 'update safety should classify boot key risk and dispatch risk events');
assert(runtimeHealth.includes('FoxBearUpdateSafety.getReport') && runtimeHealth.includes('업데이트 점검 복사'), 'Runtime Health should require and expose Update Safety report copy');
assert(runtimeHealth.includes("postMessage?.({ type: 'FOXBEAR_PURGE_CACHES' })"), 'Runtime Health cache recovery should ask active SW to purge caches');
assert(['sw-v155','sw-v156','sw-v1685'].some(key => app.includes(`./sw.js?v=1.6.85-browser-sentinel-ui-mode-header-recovery&h=${key}`)), 'app should register service worker with v1.5.5+ cache-bust key');
assert(pkg.qaChecks.includes('node --check src/boot/update-safety-service.js'), 'package qaChecks missing update safety syntax check');
assert(pkg.qaChecks.includes('node qa/v155_update_safety_asset_health_smoke.js'), 'package qaChecks missing v1.5.5 update safety smoke');
assert(readme.includes('v1.5.5 Update Safety') && handoff.includes('v1.5.5 update safety'), 'docs missing v1.5.5 update safety notes');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport), 'QA report missing a self-consistent PASS target');

console.log('PASS v1.5.5 update safety asset health smoke');
