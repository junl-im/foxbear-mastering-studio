#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const dialog = read('src/ui/download-dialog-view.js');
const serviceSource = read('src/download/download-service.js');
const css = read('assets/css/download-dialog.css');
const app = read('src/app.js');
const runtime = read('src/boot/runtime-health.js');

assert.strictEqual(pkg.version, '1.6.22');
assert(dialog.includes("foxbear:download-quality-preferences:v1"), 'quality preference storage key missing');
assert(dialog.includes('loadDownloadQualityPreferences') && dialog.includes('saveDownloadQualityPreferences'), 'safe quality preference persistence missing');
assert(dialog.includes('qualityPreferences.lastFormat'), 'last selected format is not restored');
assert(dialog.includes('getDownloadSizeEstimate'), 'dialog size estimator wiring missing');
assert(dialog.includes("download-format-option-size"), 'quality menu size label missing');
assert(dialog.includes("download-format-quality-menu download-format-quality-menu-portal"), 'portalled menu class missing');
assert(dialog.includes('backdrop.append(panel, qualityMenu)'), 'quality menu must live outside the scrollable panel');
assert(dialog.includes('global.visualViewport') && dialog.includes('viewportBottom') && dialog.includes('viewportRight'), 'visual viewport edge calculations missing');
assert(dialog.includes("qualityMenu.dataset.viewportClamped"), 'viewport clamp marker missing');
assert(dialog.includes("qualityMenu.style.maxHeight"), 'adaptive menu height missing');
assert(dialog.includes("global.visualViewport?.addEventListener?.('resize'"), 'visual viewport resize handling missing');
assert(dialog.includes('qualityMenu.remove()'), 'portalled menu cleanup missing');
assert(css.includes('position: fixed;') && css.includes('z-index: 27020;'), 'quality popup must use a top-level fixed overlay');
assert(css.includes('height: min(96dvh, 860px);'), 'mobile download sheet should use the taller viewport-contained height');
assert(css.includes('overflow-y: auto;'), 'mobile sheet/menu internal scrolling missing');
assert(css.includes('.download-format-quality-menu[data-viewport-clamped="true"]::before'), 'clamped arrow hiding rule missing');
assert(css.includes('.download-format-option-size'), 'size label styling missing');
assert(app.includes('getDownloadSizeEstimate: (trackValue, formatValue)'), 'app bridge does not pass the size estimator');
assert(runtime.includes("'FoxBearDownloadService.getDownloadSizeEstimate'"), 'runtime health does not require the size estimator');

const sandbox = {
  console, Blob, URL, Date, Math, Number, String, Boolean, Array, Object, Map, Set, WeakMap,
  JSON, Promise, Uint8Array, Int16Array, Float32Array, ArrayBuffer, DataView,
  navigator: {}, document: {}, setTimeout, clearTimeout
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(serviceSource, sandbox, { filename: 'download-service.js' });
const service = sandbox.FoxBearDownloadService;
assert(service && typeof service.getDownloadSizeEstimate === 'function');
const exactTrack = {
  outFormat: 'wav24',
  outBlob: { size: 17280044 },
  masteredDurationSec: 60,
  analysis: { sampleRate: 48000, channels: 2 }
};
const exact = service.getDownloadSizeEstimate(exactTrack, 'wav24');
assert.strictEqual(exact.bytes, 17280044);
assert.strictEqual(exact.exact, true);
assert.strictEqual(exact.source, 'current-blob');
const wav16 = service.getDownloadSizeEstimate(exactTrack, 'wav16');
assert.strictEqual(wav16.bytes, 11520044);
assert.strictEqual(wav16.source, 'wav-pcm-estimate');
const mp3 = service.getDownloadSizeEstimate(exactTrack, 'mp3_320');
assert(mp3.bytes > 2400000 && mp3.bytes < 2450000, `unexpected MP3 estimate ${mp3.bytes}`);
assert.strictEqual(mp3.source, 'mp3-cbr-estimate');
assert.strictEqual(service.getDownloadSizeEstimate({}, 'wav24'), null);

console.log('PASS v1.6.14 remembered quality, file-size estimates, and viewport-contained download menu');
