#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL module split stage3 smoke: ${message}`);
    process.exit(1);
  }
}

const index = read('index.html');
const app = read('src/app.js');
const runtimeConfig = read('src/config/app-runtime-config.js');
const siteGuards = read('src/security/site-guards.js');
const mobileNativeView = read('src/ui/mobile-native-view.js');
const sw = read('sw.js');
const studioCss = read('assets/css/studio.css');
const downloadCss = read('assets/css/download-dialog.css');

const runtimePos = index.indexOf('src/config/app-runtime-config.js');
const siteGuardsPos = index.indexOf('src/security/site-guards.js');
const mobileNativeViewPos = index.indexOf('src/ui/mobile-native-view.js');
const appPos = index.indexOf('src/app.js');
const downloadCssPos = index.indexOf('assets/css/download-dialog.css');
const studioCssPos = index.indexOf('assets/css/studio.css');

assert(runtimePos > -1, 'runtime config script is missing from index.html');
assert(siteGuardsPos > -1, 'site guards script is missing from index.html');
assert(mobileNativeViewPos > -1, 'mobile native view script is missing from index.html');
assert(appPos > -1, 'app.js script is missing from index.html');
assert(runtimePos < appPos, 'runtime config must load before app.js');
assert(siteGuardsPos < appPos, 'site guards must load before app.js');
assert(mobileNativeViewPos < appPos, 'mobile native view must load before app.js');
assert(downloadCssPos > -1, 'download dialog stylesheet is missing from index.html');
assert(studioCssPos > -1 && studioCssPos < downloadCssPos, 'download dialog CSS should load after studio.css');

assert(runtimeConfig.includes('global.FoxBearRuntimeConfig'), 'runtime config global export missing');
assert(runtimeConfig.includes('TRUSTED_SCRIPT_PATHS'), 'runtime config trusted script paths missing');
assert(runtimeConfig.includes('AUDIO_IMPORT_ACCEPT'), 'runtime config audio accept config missing');
assert(app.includes('window.FoxBearRuntimeConfig'), 'app.js does not consume runtime config module');
assert(!app.includes("const CORE_AUDIO_EXTENSIONS = ['.wav'"), 'large audio extension list still lives in app.js');

assert(siteGuards.includes('global.FoxBearSiteGuards'), 'site guards global export missing');
assert(siteGuards.includes('runSiteAccessGuard'), 'site access guard implementation missing');
assert(siteGuards.includes('initUiGuards'), 'UI guard implementation missing');
assert(app.includes('window.FoxBearSiteGuards?.runSiteAccessGuard'), 'app.js site guard wrapper missing');
assert(!app.includes('const allowedHostPatterns = ['), 'allowed host pattern implementation still lives in app.js');
assert(mobileNativeView.includes('global.FoxBearMobileNativeView'), 'mobile native view global export missing');
assert(mobileNativeView.includes('mobile-native-setting-grid') || mobileNativeView.includes('mobile-native-action-grid'), 'mobile native setting/action grid builder missing');
assert(app.includes('window.FoxBearMobileNativeView?.createMobileNativeLayer'), 'app.js mobile native view wrapper missing');
assert(!app.includes("actionGrid.className = 'mobile-native-action-grid'"), 'mobile native panel builder still lives in app.js');

assert(downloadCss.includes('.download-options-open'), 'download dialog CSS missing open state rule');
assert(downloadCss.includes('.download-options-panel-v2'), 'download dialog CSS missing v2 panel rule');
assert(!studioCss.includes('.download-options-open { overflow: hidden; }'), 'download dialog base open rule still lives in studio.css');
assert(!studioCss.includes('.download-options-panel-v2 {'), 'download dialog v2 base panel rule still lives in studio.css');

['assets/css/download-dialog.css', 'src/config/app-runtime-config.js', 'src/ui/mobile-native-view.js', 'src/security/site-guards.js'].forEach(asset => {
  assert(sw.includes(`./${asset}?v=1.6.112-mastering-lifecycle-race-hardening`), `${asset} missing from service worker CORE_ASSETS`);
});

console.log('PASS module split stage3 smoke');
