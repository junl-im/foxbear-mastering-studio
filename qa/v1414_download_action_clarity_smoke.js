#!/usr/bin/env node
'use strict';

const fs = require('fs');
const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 download action clarity smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const dialog = read('src/ui/download-dialog-view.js');
const service = read('src/download/download-service.js');
const css = read('assets/css/download-dialog.css');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');

assert(pkg.version === '1.5.91', 'package version should be 1.5.91');
assert(pkg.name === 'foxbear-mastering-studio', 'package name should match v1.5.91');
assert(index.includes('data-build="1.5.91"'), 'index build should be v1.5.91');
assert(index.includes('1.5.91-cancellable-audio-pipeline-performance-guards'), 'index should use v1.5.91 action clarity cache key');
assert(sw.includes('foxbear-shell-v1.5.91-cancellable-audio-pipeline-performance-guards'), 'service worker should use action clarity cache key');

assert(service.includes("version: '1.5.91'"), 'download diagnostics/flow should report v1.5.91');
assert(service.includes('getRecommendedDownloadFlow'), 'recommended flow helper should remain in download service');

assert(dialog.includes('const actionLabel = action =>'), 'dialog should map action labels explicitly');
assert(dialog.includes('const primaryAction = flow?.primaryAction'), 'dialog should derive a primary action');
assert(dialog.includes('const secondaryAction ='), 'dialog should derive a secondary action');
assert(dialog.includes('const tertiaryAction ='), 'dialog should derive a tertiary action');
assert(dialog.includes('applyActionMeta(download, primaryAction, true)'), 'primary button should get recommended action metadata');
assert(dialog.includes('button.dataset.downloadAction = action'), 'buttons should expose data-download-action');
assert(dialog.includes("button.setAttribute('data-recommended', 'true')"), 'recommended button should expose data-recommended');
assert(dialog.includes('bindActionButton(download, primaryAction'), 'primary button should bind through action dispatcher');
assert(dialog.includes('bindActionButton(share, secondaryAction'), 'secondary button should bind through action dispatcher');
assert(dialog.includes('bindActionButton(help, tertiaryAction'), 'tertiary button should bind through action dispatcher');
assert(!dialog.includes("download.addEventListener('click', async"), 'legacy direct download listener should be replaced');
assert(!dialog.includes("share.addEventListener('click', async"), 'legacy direct share listener should be replaced');
assert(!dialog.includes("help.addEventListener('click', async"), 'legacy direct help listener should be replaced');
assert(dialog.includes('showDownloadAssist(URL.createObjectURL(exported.blob), exported.fileName, exported.blob.type || \'audio/*\', exported.blob, deps)'), 'assist helper should receive deps for toast/state tracking');
assert(dialog.includes('downloadBlob(exported.blob, exported.fileName, deps)'), 'downloadBlob should receive deps');
assert(dialog.includes('shareDownloadFile(exported.blob, exported.fileName, deps)'), 'shareDownloadFile should receive deps');
assert(dialog.includes('copyCurrentPageUrl(deps)'), 'URL copy should receive deps');
assert(dialog.includes('copyDownloadDiagnostics(track.outBlob || null, track.outName || track.name || \'FoxBear mastered file\', deps)'), 'diagnostics copy should receive deps');
assert(dialog.includes('openCurrentPageInExternalBrowser(deps)'), 'external browser helper should receive deps');

assert(app.includes('showToast,\n        foxBearHaptic'), 'app should pass showToast into download dialog deps');
assert(css.includes('.download-options-actions-v1414'), 'CSS should style v1.5.91 action row');
assert(css.includes('button.is-recommended::after'), 'CSS should show recommended action badge');
assert(css.includes('data-download-action="diagnostics"'), 'CSS should include diagnostics action selector');

assert(matrix.includes('v1.4.26 Download action clarity'), 'QA matrix should document action clarity');
assert(matrix.includes('data-download-action'), 'QA matrix should include button action metadata checks');
assert(matrix.includes('Advanced actions are hidden behind'), 'QA matrix should retain advanced action collapse scenario');

console.log('PASS v1.4.26 download action clarity smoke');
