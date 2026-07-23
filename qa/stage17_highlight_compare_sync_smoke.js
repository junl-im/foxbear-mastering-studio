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

const html = read('index.html');
const sw = read('sw.js');
const config = read('src/config/app-runtime-config.js');
const health = read('src/boot/runtime-health.js');
const compare = read('src/ui/waveform-compare-view.js');
const app = read('src/app.js');
const pkg = JSON.parse(read('package.json'));
const assetVersion = '1.5.82-mastering-cancel-playback-resume-recovery';

assert(pkg.version === '1.5.82', 'Stage17 should keep official app version at 1.4.0');
assert(pkg.description.includes('FoxBear'), 'package description should identify latest Stage17+ line');
assert(config.includes(`const ASSET_VERSION = '${assetVersion}'`), 'runtime config should use Stage17 asset version');
assert(health.includes(`const FALLBACK_VERSION = '${assetVersion}'`), 'runtime health fallback should use Stage17 asset version');
assert(sw.includes(`foxbear-shell-v${assetVersion}`), 'service worker cache should use Stage17 asset version');
assert(html.includes(`src/ui/waveform-compare-view.js?v=${assetVersion}`), 'waveform compare module should be cache-busted for Stage17');
assert(sw.includes(`./src/ui/waveform-compare-view.js?v=${assetVersion}`), 'service worker should precache Stage17 waveform compare module');
assert(app.includes(`navigator.serviceWorker.register('./sw.js?v=${assetVersion}')`), 'service worker registration should use Stage17 query');

assert(compare.includes("options.scope === 'preview'") && compare.includes('alignedStartSec'), 'compare listen handler should branch on preview scope and aligned start');
assert(compare.includes("source: 'waveform-compare-listen'"), 'compare listen handler should stamp transport source');
assert(compare.includes('absoluteSec: alignedStartSec'), 'compare listen transport should preserve absolute preview start');
assert(compare.includes("mode === 'masterPreview' ? 0 : alignedStartSec") || compare.includes('Number.isFinite(alignedLocalSec)'), 'original listen should seek to absolute highlight start while master preview starts at local zero');
assert(compare.includes('audio.addEventListener(\'loadedmetadata\''), 'compare listen should handle metadata-delayed seek');
assert(compare.includes('rangeText'), 'compare listen toast should expose synced range feedback');
assert(compare.includes("scope: 'preview'"), 'preview comparison rows should keep preview scope metadata');
assert(compare.includes('startSec: compareWindow.startSec') && compare.includes('durationSec: compareWindow.durationSec'), 'preview comparison rows should carry start and duration metadata');

console.log('PASS Stage17 highlight compare listen sync smoke');
