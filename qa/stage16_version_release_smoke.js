#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { getReleaseMetadata, renderBuildInfo } = require('../tools/release-metadata');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

const meta = getReleaseMetadata();
const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('manifest.webmanifest'));
const html = read('index.html');
const app = read('src/app.js');
const config = read('src/config/app-runtime-config.js');
const health = read('src/boot/runtime-health.js');
const buildInfo = read('src/config/build-info.js');
const sw = read('sw.js');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(pkg.name === 'foxbear-mastering-studio', 'package name should be stable and version-independent');
assert(pkg.version === meta.productVersion, 'package version should match release metadata');
assert(manifest.version === meta.productVersion, 'manifest version should match package version');
assert(html.includes(`<title>FoxBear Mastering PRO v${meta.productVersion}</title>`), 'title should show product version');
assert(html.includes(`data-build="${meta.productVersion}"`), 'body data-build should match product version');
assert(html.includes(`버전 정보 v${meta.productVersion}`), 'visible version button should match product version');
assert(html.includes(`FoxBear Mastering PRO v${meta.productVersion}`), 'program info should match product version');
assert(app.includes(`const APP_VERSION = '${meta.appVersion}'`), 'app version constant should match product version');
assert(config.includes(`'${meta.assetVersion}'`) && config.includes('global.FoxBearBuildInfo'), 'runtime config should consume synchronized asset metadata');
assert(health.includes(`'${meta.assetVersion}'`) && health.includes('global.FoxBearBuildInfo'), 'runtime health fallback should match asset metadata');
assert(buildInfo === renderBuildInfo(meta), 'generated build-info should match package metadata');
assert(sw.includes(`const CACHE_NAME = '${meta.cacheName}'`), 'service worker cache should match release metadata');
assert(app.includes(`./sw.js?v=${meta.assetVersion}&h=${meta.serviceWorkerRevision}`), 'service worker registration should match release metadata');
['src/config/build-info.js', 'src/app.js', 'src/boot/runtime-health.js', 'assets/css/mobile-native.css', 'manifest.webmanifest'].forEach(asset => {
  assert(html.includes(`${asset}?v=${meta.assetVersion}`), `${asset} should use current asset version in index.html`);
  assert(sw.includes(`./${asset}?v=${meta.assetVersion}`), `${asset} should use current asset version in sw.js`);
});
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should follow package.json version');
assert(!html.includes('1.3.84') && !app.includes('1.3.84') && !config.includes('1.3.84') && !sw.includes('1.3.84'), 'obsolete runtime version should not return');
console.log(`PASS v${meta.productVersion} version release smoke`);
