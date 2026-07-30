#!/usr/bin/env node
'use strict';

const fs = require('fs');
const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 download flow polish smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const service = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const css = read('assets/css/download-dialog.css');
const app = read('src/app.js');
const runtime = read('src/boot/runtime-health.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');

assert(pkg.version === '1.6.40', 'package version should be 1.6.40');
assert(index.includes('data-build="1.6.40"'), 'index build should be 1.6.40');
assert(index.includes('1.6.40-ui-shell-retry-replacement-settlement'), 'asset cache key should use v1.6.40 flow polish');
assert(sw.includes('foxbear-shell-v1.6.40-ui-shell-retry-replacement-settlement'), 'service worker cache should use v1.6.40 flow polish');

assert(service.includes('getRecommendedDownloadFlow'), 'download service should expose a recommended flow helper');
assert(service.includes("primaryAction: shareReady ? 'share' : 'assist'"), 'restricted flow should prefer share or assist');
assert(service.includes('카카오에서는 공유/저장이 가장 안정적입니다.'), 'restricted flow should explain share/save first');
assert(service.includes("version: '1.6.40'"), 'download flow/diagnostics should report v1.6.40');

assert(dialog.includes('getRecommendedDownloadFlow'), 'dialog should consume recommended flow helper');
assert(dialog.includes('download-options-flow-card'), 'dialog should render a recommended flow card');
assert(dialog.includes('download-options-steps-compact'), 'dialog should render compact flow steps');
assert(dialog.includes('download-options-more-toggle'), 'dialog should include an advanced-options toggle');
assert(dialog.includes('is-collapsed'), 'advanced fallback actions should be collapsed by default');
assert(dialog.includes('추가 옵션 닫기'), 'advanced-options toggle should support closing');
assert(dialog.includes('진단 복사'), 'diagnostics copy should remain available in advanced actions');

assert(css.includes('.download-options-flow-card'), 'CSS should style the recommended flow card');
assert(css.includes('.download-options-steps-compact'), 'CSS should style compact flow steps');
assert(css.includes('.download-options-actions-fallback.is-collapsed'), 'CSS should hide collapsed advanced actions');
assert(css.includes('.download-options-more-toggle[aria-expanded="true"]'), 'CSS should style expanded advanced toggle');

assert(app.includes('function getRecommendedDownloadFlow'), 'app should expose a recommended flow wrapper');
assert(app.includes('getRecommendedDownloadFlow,'), 'app should pass recommended flow into dialog');
assert(runtime.includes('FoxBearDownloadService.getRecommendedDownloadFlow'), 'runtime health should require recommended flow helper');
assert(matrix.includes('v1.4.26 Download flow polish'), 'QA matrix should document v1.6.40 flow polish');
assert(matrix.includes('Advanced actions are hidden behind'), 'QA matrix should include advanced action collapse scenario');

console.log('PASS v1.4.26 download flow polish smoke');
