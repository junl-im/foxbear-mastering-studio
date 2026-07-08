#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.24 render scheduler bulk import smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const config = read('src/config/app-runtime-config.js');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const transition = read('src/audio/playback-transition-service.js');
const decode = read('src/audio/audio-decode-service.js');
const index = read('index.html');
const sw = read('sw.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.24.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

assert(pkg.version === '1.4.24', 'package version should be 1.4.24');
assert(pkg.name === 'foxbear-github-pro-v1-4-24', 'package name should be v1-4-24');
assert(index.includes('data-build="1.4.24"'), 'index build marker should be 1.4.24');
assert(config.includes("ASSET_VERSION = '1.4.24-bulk-import-hud'"), 'runtime asset key should be v1.4.24');
assert(sw.includes('foxbear-shell-v1.4.24-bulk-import-hud'), 'service worker cache should use v1.4.24 key');

assert(app.includes('function scheduleRenderAll'), 'app should define render scheduler');
assert(app.includes('window.FoxBearRenderScheduler'), 'render scheduler diagnostics should be exposed');
assert(app.includes('function getRenderSchedulerSnapshot'), 'render scheduler snapshot should exist');
assert(app.includes('renderQueue: typeof getRenderSchedulerSnapshot'), 'bulk import snapshot should include render queue state');
assert(app.includes("scheduleRenderAll('analysis-start'"), 'analysis start should use scheduled render');
assert(app.includes("scheduleRenderAll('analysis-complete'"), 'analysis completion should use scheduled render');
assert(app.includes('largeImportActive') && read('src/boot/render-scheduler.js').includes('DEFAULT_BULK_DELAY_MS'), 'bulk import render throttle helper should exist');

assert(app.includes("async function requestFoxBearWakeLock(reason = '', options = {})"), 'wake lock request should accept silent options');
assert(app.includes("requestFoxBearWakeLock('작업 보호 중', { toast: false, auto: true })"), 'automatic activity wake lock should be silent');
assert(!app.includes("requestFoxBearWakeLock('작업 보호 중');"), 'automatic wake lock toast path should be removed');

assert(app.includes('bulkRecommendationMode'), 'tracks should record single vs bulk recommendation mode');
assert(app.includes('각 곡 AI 추천값은 자동 적용됩니다'), 'bulk import should tell users AI recommendations auto-apply');
assert(app.includes('추천값 선택 팝업을 준비합니다'), 'single import should keep recommendation choice flow');
assert(app.includes('ANALYSIS_ENGINE_CACHE_VERSION'), 'analysis cache key should be engine-version based');
assert(!app.includes("APP_VERSION].join('|')"), 'analysis cache key should not be tied directly to APP_VERSION');

assert(transition.includes('const DEFAULT_FADE_MS = 140'), 'transition fade should be smoother at 140ms');
assert(transition.includes('function waitForMediaReady'), 'transition service should wait for next media readiness');
assert(runtime.includes('FoxBearPlaybackTransitionService.waitForMediaReady'), 'runtime health should require media readiness helper');

assert(decode.includes('FoxBearAudioDecodeService'), 'audio decode service should exist');
assert(decode.includes('decodeAudioFile'), 'audio decode service should expose decodeAudioFile');
assert(app.includes('FoxBearAudioDecodeService'), 'app decode path should delegate to audio decode service');
assert(index.includes('src/boot/render-scheduler.js?v=1.4.24-bulk-import-hud'), 'index should load render scheduler service');
assert(index.includes('src/audio/audio-decode-service.js?v=1.4.24-bulk-import-hud'), 'index should load audio decode service');
assert(sw.includes('./src/boot/render-scheduler.js?v=1.4.24-bulk-import-hud'), 'service worker should precache render scheduler');
assert(sw.includes('./src/audio/audio-decode-service.js?v=1.4.24-bulk-import-hud'), 'service worker should precache audio decode service');
assert(runtime.includes('FoxBearAudioDecodeService.decodeAudioFile'), 'runtime health should require audio decode service');
assert(pkg.qaChecks.includes('node --check src/boot/render-scheduler.js'), 'package QA should syntax-check render scheduler service');
assert(pkg.qaChecks.includes('node --check src/audio/audio-decode-service.js'), 'package QA should syntax-check audio decode service');

assert(perf.includes('importQueue = safeCall'), 'performance diagnostics should collect import queue');
assert(perf.includes('renderScheduler = safeCall'), 'performance diagnostics should collect render scheduler');
assert(perf.includes('bulk-import-active'), 'performance summary should warn while bulk import is active');
assert(runtime.includes('FoxBearRenderScheduler.getSnapshot'), 'runtime health should require render scheduler');

assert(matrix.includes('v1.4.24 Render Scheduler + Bulk Import UI Throttle'), 'matrix should document v1.4.24 scope');
assert(qaReport.includes('144/144 PASS') || qaReport.includes('v1.4.24 final QA'), 'QA report should mention v1.4.24 final QA');
assert(changelog.includes('v1.4.24'), 'changelog should mention v1.4.24');

console.log('PASS v1.4.24 carry-forward: render scheduler, silent wake lock, cache, decode, crossfade smoke');
