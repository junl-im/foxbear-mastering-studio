#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 download dialog declutter smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const service = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const app = read('src/app.js');
const css = read('assets/css/download-dialog.css');
const runtime = read('src/boot/runtime-health.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

assert(pkg.version === '1.5.13', 'package version should be 1.5.13');
assert(pkg.name === 'foxbear-mastering-studio', 'package name should match 1.5.13');
assert(index.includes('data-build="1.5.13"'), 'index build marker should be 1.5.13');
assert(index.includes('1.5.13-handoff-package-integrity'), 'index should use declutter asset key');
assert(sw.includes('foxbear-shell-v1.5.13-handoff-package-integrity'), 'service worker should use v1.5.13 cache key');

assert(service.includes('getDownloadDialogDisplayProfile'), 'download service should expose display profile helper');
assert(service.includes("mode: restricted ? 'restricted-declutter' : 'standard-declutter'"), 'display profile should distinguish restricted and standard modes');
assert(service.includes('showChecklistOnOpen: false'), 'display profile should keep checklist hidden on initial open');
assert(service.includes('maxInitialReceiptSteps'), 'display profile should cap initial receipt steps');
assert(runtime.includes('FoxBearDownloadService.getDownloadDialogDisplayProfile'), 'runtime health should require display profile helper');

assert(dialog.includes('getDownloadDialogDisplayProfile'), 'dialog should consume display profile helper');
assert(dialog.includes('download-options-panel-v5'), 'dialog should use v5 panel class');
assert(dialog.includes('dataset.downloadDisplayMode'), 'dialog should tag display mode');
assert(dialog.includes("renderReceipt(primaryAction, null, '', { initial: true })"), 'initial receipt should render in idle mode');
assert(dialog.includes('receipt.classList.toggle(\'is-idle\''), 'idle receipt class should be toggled');
assert(dialog.includes('showChecklistOnOpen === false'), 'dialog should hide checklist on open');
assert(dialog.includes('getDownloadActionReceipt,'), 'app deps should pass action receipt into dialog');
assert(app.includes('getDownloadDialogDisplayProfile,'), 'app deps should pass display profile into dialog');
assert(app.includes('function getDownloadDialogDisplayProfile'), 'app should provide display profile wrapper');

assert(css.includes('Download dialog first-screen declutter'), 'CSS should document declutter styles');
assert(css.includes('.download-options-panel-v5[data-download-display-mode$="declutter"]'), 'CSS should style declutter mode');
assert(css.includes('.download-options-checklist.is-empty'), 'CSS should hide empty checklist');

assert(pkg.qaChecks.includes('node qa/v1419_download_dialog_declutter_smoke.js'), 'package QA should include v1.5.13 smoke');
assert(matrix.includes('v1.4.26 Download dialog first-screen declutter'), 'matrix should document v1.5.13 scope');
assert(qaReport.includes('144/144 PASS') || qaReport.includes('v1.5.13 final QA'), 'QA report should mention final v1.5.13 pass count');
assert(changelog.includes('getDownloadDialogDisplayProfile'), 'changelog should mention display profile helper');

console.log('PASS v1.4.26 download dialog declutter smoke');
