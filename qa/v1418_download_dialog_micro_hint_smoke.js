#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 download dialog micro hint smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const service = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const css = read('assets/css/download-dialog.css');
const runtime = read('src/boot/runtime-health.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');
const readme = read('README.md');

assert(pkg.version === '1.5.98', 'package version should be 1.5.98');
assert(pkg.name === 'foxbear-mastering-studio', 'package name should match 1.5.98');
assert(index.includes('data-build="1.5.98"'), 'index build marker should be 1.5.98');
assert(index.includes('1.5.98-worker-retry-health-levels'), 'index should use micro hint asset key');
assert(sw.includes('foxbear-shell-v1.5.98-worker-retry-health-levels'), 'service worker should use micro hint cache key');

assert(service.includes('getDownloadDialogCompactHint'), 'download service should expose dialog micro hint helper');
assert(service.includes("version: '1.5.98'"), 'download helpers should report v1.5.98');
assert(service.includes("mode: restricted ? 'restricted-micro' : 'standard-micro'"), 'micro hint should distinguish restricted and standard modes');
assert(service.includes('visibleStepLimit: restricted ? 2 : 1'), 'micro hint should cap first-screen steps');
assert(service.includes('advancedLabel'), 'micro hint should route diagnostics/copy to additional options');
assert(runtime.includes('FoxBearDownloadService.getDownloadDialogCompactHint'), 'runtime health should require micro hint helper');

assert(dialog.includes('getDownloadDialogCompactHint'), 'dialog should consume micro hint helper');
assert(dialog.includes('download-options-compact-hint'), 'dialog should render micro hint bar');
assert(dialog.includes('dataset.downloadHintMode'), 'dialog should tag hint mode for QA/debugging');
assert(dialog.includes('visibleStepLimit'), 'dialog should apply visible step limit');
const appendCount = (dialog.match(/steps\.appendChild\(item\)/g) || []).length;
assert(appendCount === 1, 'dialog should append each flow step only once');
assert(dialog.includes("panel.append(close, title, name, warning, listLabel, list, selectedSummary, actions)"), 'v1.5.98 should mount the compact first-screen dialog stack');
assert(!dialog.includes('panel.append(close, title, name, envBox, flowCard'), 'verbose micro-hint cards must not be mounted by v1.5.98');

assert(css.includes('Download dialog micro hint'), 'CSS should document micro hint styles');
assert(css.includes('.download-options-compact-hint.restricted'), 'CSS should style restricted micro hint');
assert(css.includes('.download-options-compact-hint small'), 'CSS should style advanced hint copy');

assert(pkg.qaChecks.includes('node qa/v1418_download_dialog_micro_hint_smoke.js'), 'package QA should include v1.5.98 micro hint smoke');
assert(matrix.includes('v1.4.26 Download dialog micro hint'), 'matrix should document v1.5.98 micro hint flow');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport), 'QA report should mention final v1.5.98 pass count');
assert(changelog.includes('getDownloadDialogCompactHint'), 'changelog should mention micro hint helper');
assert(readme.includes('Download dialog micro hint'), 'README should mention v1.5.98 scope');

console.log('PASS v1.4.26 download dialog micro hint smoke');
