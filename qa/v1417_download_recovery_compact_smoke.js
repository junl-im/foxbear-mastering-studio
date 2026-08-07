#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.17 compact recovery carry-forward smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const service = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const css = read('assets/css/download-dialog.css');
const runtime = read('src/boot/runtime-health.js');

assert(pkg.version === '1.6.78', 'package version should carry forward to 1.6.78');
assert(service.includes('getDownloadCompactRecoveryPlan'), 'compact recovery plan helper should remain available');
assert(service.includes('copyDownloadRecoveryChecklist'), 'checklist copy helper should remain available');
assert(!service.includes('area.remove();\n        area.remove();'), 'clipboard fallback should not remove the same textarea twice');
assert(runtime.includes('FoxBearDownloadService.getDownloadCompactRecoveryPlan'), 'runtime health should still require compact recovery plan');
assert(dialog.includes('getDownloadCompactRecoveryPlan'), 'dialog should keep compact recovery fallback helper');
assert(dialog.includes('download-options-checklist-compact'), 'dialog should keep compact checklist class');
assert(dialog.includes('download-options-checklist-steps-compact'), 'dialog should keep compact checklist steps class');
assert(dialog.includes('plan?.optionalAction'), 'dialog should keep optional compact fallback hint');
assert(css.includes('.download-options-checklist-optional'), 'CSS should keep compact optional hint styling');
assert(pkg.qaChecks.includes('node qa/v1417_download_recovery_compact_smoke.js'), 'package QA should keep v1.4.17 carry-forward smoke');

console.log('PASS v1.4.17 compact recovery carry-forward smoke');
