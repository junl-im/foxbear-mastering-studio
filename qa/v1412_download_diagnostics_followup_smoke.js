#!/usr/bin/env node
'use strict';

const fs = require('fs');
const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 download diagnostics follow-up smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const service = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const css = read('assets/css/download-dialog.css');
const app = read('src/app.js');
const runtime = read('src/boot/runtime-health.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');

assert(pkg.version === '1.5.43', 'package version should be 1.5.43');
assert(service.includes('MAX_DOWNLOAD_DIAGNOSTIC_EVENTS'), 'download service should cap diagnostic history');
assert(service.includes('recordDownloadEvent'), 'download service should record events');
assert(service.includes('getDownloadDiagnosticEvents'), 'download service should expose recent events');
assert(service.includes('serializeDownloadDiagnostics'), 'download service should serialize diagnostics');
assert(service.includes('copyDownloadDiagnostics'), 'download service should copy diagnostics');
assert(service.includes("recordDownloadEvent('share-start'"), 'share start should be recorded');
assert(service.includes("recordDownloadEvent('share-failed'"), 'share failure should be recorded');
assert(service.includes("recordDownloadEvent('anchor-download-click'"), 'anchor download clicks should be recorded');
assert(service.includes("recordDownloadEvent('assist-open'"), 'assist opens should be recorded');
assert(service.includes('standalone') && service.includes('secureContext'), 'diagnostics should include PWA/secure-context info');

assert(dialog.includes('copyDownloadDiagnostics'), 'download dialog should accept diagnostics copy dependency');
assert(dialog.includes('진단 복사'), 'download dialog should expose diagnostics copy action');
assert(app.includes('function copyDownloadDiagnostics'), 'app should expose diagnostics copy wrapper');
assert(runtime.includes('FoxBearDownloadService.getDownloadDiagnostics'), 'runtime health should require getDownloadDiagnostics');
assert(runtime.includes('FoxBearDownloadService.copyDownloadDiagnostics'), 'runtime health should require copyDownloadDiagnostics');
assert(css.includes('.download-assist-support'), 'CSS should style assist capability badges');
assert(css.includes('repeat(5, minmax(0, 1fr))'), 'fallback actions should handle extra diagnostics action on desktop');
assert(matrix.includes('v1.4.26 Download flow polish'), 'QA matrix should document v1.5.43 download checks');
assert(matrix.includes('Diagnostics copy') || matrix.includes('진단 복사'), 'QA matrix should include diagnostics copy scenario');

console.log('PASS v1.4.26 download diagnostics follow-up smoke');
