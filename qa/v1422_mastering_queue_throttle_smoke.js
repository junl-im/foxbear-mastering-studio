#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 mastering queue throttle smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const config = read('src/config/app-runtime-config.js');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const index = read('index.html');
const sw = read('sw.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

assert(pkg.version === '1.6.61', 'package version should be 1.6.61');
assert(pkg.name === 'foxbear-mastering-studio', 'package name should be v1-4-26');
assert(index.includes('data-build="1.6.61"'), 'index build marker should be 1.6.61');
assert(config.includes("ASSET_VERSION = '1.6.61-human-readable-download-filenames'"), 'runtime asset key should be v1.6.61');
assert(sw.includes('foxbear-shell-v1.6.61-human-readable-download-filenames'), 'service worker cache should use v1.6.61 key');

assert(config.includes('MASTERING_PROGRESS_RENDER_DELAY_MS: 110'), 'runtime config should expose progress render delay');
assert(app.includes('SAFE_MASTERING_PROGRESS_RENDER_DELAY_MS'), 'app should normalize mastering progress render delay');
assert(app.includes('function getMasteringQueueSnapshot'), 'mastering queue snapshot should exist');
assert(app.includes('window.FoxBearMasteringGuard'), 'mastering guard should be globally exposed');
assert(app.includes('markMasteringQueueStart(track'), 'masterTrack should mark queue start');
assert(app.includes('markMasteringQueueEnd(track'), 'masterTrack should mark queue end');
assert(app.includes("scheduleRenderAll('mastering-progress'"), 'mastering progress should use scheduled render');
assert(!app.includes('renderAll({ keepDetailAudio: true });\n        if (!options.noYield) await yieldToBrowser();'), 'progress loop should not force renderAll every step');
assert(app.includes("scheduleRenderAll('mastering-final'"), 'mastering final render should flush through scheduler');
assert(app.includes('currentSourceBuffer = null;') && app.includes('preparedBuffer = null;') && app.includes('masteredBuffer = null;'), 'transient buffers should be explicitly cleared in finally');

assert(perf.includes('masteringQueue = safeCall'), 'performance diagnostics should collect mastering queue');
assert(perf.includes('mastering-active'), 'performance diagnostics should warn while mastering is active');
assert(perf.includes('masteringQueue:'), 'performance summary should include mastering queue');
assert(runtime.includes('FoxBearMasteringGuard.getSnapshot'), 'runtime health should require mastering guard');
assert(pkg.qaChecks.includes('node qa/v1422_mastering_queue_throttle_smoke.js'), 'package QA should include v1.6.61 smoke');
assert(matrix.includes('v1.4.26 Mastering Queue Throttle'), 'matrix should document v1.6.61 scope');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport), 'QA report should mention v1.6.61 final QA');
assert(changelog.includes('v1.6.61'), 'changelog should mention v1.6.61');

console.log('PASS v1.4.26 mastering queue throttle and diagnostics smoke');
