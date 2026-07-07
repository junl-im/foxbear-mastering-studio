#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('manifest.webmanifest'));
const html = read('index.html');
const app = read('src/app.js');
const config = read('src/config/app-runtime-config.js');
const health = read('src/boot/runtime-health.js');
const sw = read('sw.js');
const overwrite = read('tools/create-overwrite-zip.sh');
const version = '1.4.10';
const assetVersion = '1.4.10-perf-polish';

assert(pkg.name === 'foxbear-github-pro-v1-4-10', 'package name should be v1.4.10');
assert(pkg.version === version, 'package version should be 1.4.10');
assert(pkg.description.includes('v1.4.10') && pkg.description.includes('Spectrum'), 'package description should identify latest v1.4.10 line');
assert(manifest.version === version, 'manifest should carry version 1.4.10');
assert(html.includes('<title>FoxBear Mastering PRO v1.4.10</title>'), 'title should show v1.4.10');
assert(html.includes('data-build="1.4.10"'), 'body data-build should be 1.4.10');
assert(html.includes('버전 정보 v1.4.10'), 'visible version button should show v1.4.10');
assert(html.includes('FoxBear Mastering PRO v1.4.10'), 'program info should show v1.4.10');
assert(app.includes("const APP_VERSION = 'Pro v1.4.10'"), 'app version constant should be Pro v1.4.10');
assert(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.4.0-dock-modal-state-machine'"), 'DSP profile version should use v1.4.0');
assert(config.includes(`const ASSET_VERSION = '${assetVersion}'`), 'runtime config asset version should be latest stage');
assert(health.includes(`const FALLBACK_VERSION = '${assetVersion}'`), 'runtime health fallback should be latest stage');
assert(sw.includes(`foxbear-shell-v${assetVersion}`), 'service worker cache should use latest v1.4.10 line');
assert(app.includes(`navigator.serviceWorker.register('./sw.js?v=${assetVersion}')`), 'service worker registration should use latest stage query');
['src/app.js', 'src/boot/runtime-health.js', 'assets/css/mobile-native.css', 'manifest.webmanifest'].forEach(asset => {
  assert(html.includes(`${asset}?v=${assetVersion}`), `${asset} should use latest stage query in index.html`);
  assert(sw.includes(`./${asset}?v=${assetVersion}`), `${asset} should use latest stage query in sw.js`);
});
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should follow package.json version');
assert(!html.includes('1.3.84'), 'index.html should not display old 1.3.84 runtime version');
assert(!app.includes('1.3.84'), 'src/app.js should not contain old runtime version');
assert(!config.includes('1.3.84'), 'runtime config should not contain old runtime version');
assert(!sw.includes('1.3.84'), 'service worker should not contain old runtime version');
console.log('PASS v1.4.10 version release smoke');
