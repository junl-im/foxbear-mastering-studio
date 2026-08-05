#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 audio decode memory guard smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const config = read('src/config/app-runtime-config.js');
const decode = read('src/audio/audio-decode-service.js');
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

assert(decode.includes("SERVICE_VERSION = '1.6.61-human-readable-download-filenames'"), 'decode service should be bumped');
assert(decode.includes('const MAX_DECODE_EVENTS'), 'decode diagnostics event cap should exist');
assert(decode.includes('activeDecodes'), 'decode diagnostics should track active decodes');
assert(decode.includes('function getDecodedBufferSummary'), 'decode service should summarize decoded buffers');
assert(decode.includes('function estimateDecodedPcmBytes'), 'decode service should estimate PCM memory');
assert(decode.includes('function getDiagnostics'), 'decode service should expose diagnostics');
assert(decode.includes('arrayBuffer = null;'), 'decode service should release ArrayBuffer reference in finally');
assert(decode.includes("pushEvent('decode-start'") && decode.includes("pushEvent('decode-complete'") && decode.includes("pushEvent('decode-failed'"), 'decode events should record lifecycle');
assert(decode.includes('verifyMediaElementCanLoad'), 'media element fallback check should remain');

assert(app.includes('FoxBearAudioDecodeService') && app.includes('service.decodeAudioFile'), 'app should continue delegating decode path');
assert(runtime.includes('FoxBearAudioDecodeService.getDiagnostics'), 'runtime health should require decode diagnostics');
assert(perf.includes('audioDecode = safeCall'), 'performance diagnostics should collect decode diagnostics');
assert(perf.includes('audio-decode-active'), 'performance summary should warn while decode is active');
assert(perf.includes('audioDecode:'), 'performance summary should expose audio decode status');
assert(index.includes('src/audio/audio-decode-service.js?v=1.6.61-human-readable-download-filenames'), 'index should load versioned decode service');
assert(sw.includes('./src/audio/audio-decode-service.js?v=1.6.61-human-readable-download-filenames'), 'service worker should precache decode service');
assert(pkg.qaChecks.includes('node qa/v1423_audio_decode_memory_guard_smoke.js'), 'package QA should include v1.6.61 smoke');
assert(matrix.includes('Audio Decode Memory Guard'), 'matrix should document v1.6.61 audio decode guard scope');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport), 'QA report should mention v1.6.61 final QA');
assert(changelog.includes('v1.6.61'), 'changelog should mention v1.6.61');

console.log('PASS v1.4.26 audio decode diagnostics and memory guard smoke');
