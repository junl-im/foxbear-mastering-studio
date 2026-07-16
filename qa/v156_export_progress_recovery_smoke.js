#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL v1.5.6 export progress recovery smoke: ${message}`);
    process.exit(1);
  }
}
function sri(path) {
  return `sha384-${crypto.createHash('sha384').update(fs.readFileSync(path)).digest('base64')}`;
}

const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const view = read('src/download/export-progress-view.js');
const css = read('assets/css/export.css');
const updateSafety = read('src/boot/update-safety-service.js');
const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const changelog = read('CHANGELOG.md');
const qaReport = read('qa/QA_REPORT.md');

assert(fs.existsSync('src/download/export-progress-view.js'), 'export progress view file missing');
assert(index.includes('src/download/export-progress-view.js?v=1.5.29-analysis-update-lifecycle&h=export-progress-v156'), 'export progress view not loaded with v1.5.6 cache key');
assert(index.indexOf('src/download/export-guard-service.js') < index.indexOf('src/download/export-progress-view.js'), 'export progress view should load after Export Guard');
assert(index.indexOf('src/download/export-progress-view.js') < index.indexOf('src/ui/download-dialog-view.js'), 'export progress view should load before app UI dependencies');
assert(sw.includes('./src/download/export-progress-view.js?v=1.5.29-analysis-update-lifecycle&h=export-progress-v156'), 'export progress view not precached');
assert(index.includes('assets/css/export.css?v=1.5.29-analysis-update-lifecycle&h=export-progress-v156'), 'export CSS cache key missing');
assert(sw.includes('./assets/css/export.css?v=1.5.29-analysis-update-lifecycle&h=export-progress-v156'), 'export CSS cache key missing from SW');
assert(index.includes(sri('src/download/export-progress-view.js')), 'export progress view SRI mismatch');
assert(index.includes(sri('assets/css/export.css')), 'export CSS SRI mismatch');
assert(index.includes(sri('src/app.js')), 'app SRI mismatch');

['exportProgressPanel','exportProgressTitle','exportProgressStatus','exportProgressBar','exportProgressPercent','exportProgressChecklist','exportProgressOpenDownloads','exportProgressClose'].forEach(id => {
  assert(index.includes(`id="${id}"`), `${id} DOM id missing`);
});
assert(view.includes('FoxBearExportProgressView') && view.includes('begin(plan') && view.includes('update(meta') && view.includes('complete(result') && view.includes('fail(message'), 'export progress view API incomplete');
assert(view.includes('foxbear:export-show-track-downloads') && app.includes('foxbear:export-show-track-downloads'), 'per-track fallback event bridge missing');
assert(app.includes('const progressView = window.FoxBearExportProgressView'), 'downloadZip should use progress view');
assert(app.includes('progressView?.begin') && app.includes('progressView?.update') && app.includes('progressView?.complete') && app.includes('progressView?.fail'), 'downloadZip does not cover progress states');
assert(app.includes('zip.generateAsync') && app.includes('currentFile'), 'ZIP progress callback should expose current file');
assert(css.includes('.export-progress-panel') && css.includes('.export-progress-meter') && css.includes('.export-progress-panel.is-failed'), 'export progress CSS missing');
assert(['boot-sri-v156','boot-sri-v1529'].some(key => index.includes(`h=${key}`) && sw.includes(`h=${key}`)), 'boot-critical v1.5.6+ cache key missing');
assert(['update-safety-v156','update-safety-v1529'].some(key => index.includes(`h=${key}`) && sw.includes(`h=${key}`)), 'update safety v1.5.6+ cache key missing');
assert(updateSafety.includes('const EXPECTED_BOOT_KEY = BUILD_INFO.bootRevision ||') && updateSafety.includes('boot-sri-v1529'), 'Update Safety expected boot key should be build-info driven');
assert((sw.includes("foxbear-shell-v1.5.6-export-progress-recovery") || sw.includes("foxbear-shell-v1.5.29-analysis-update-lifecycle")) && sw.includes("foxbear-shell-v1.5.5-update-safety"), 'service worker cache generation/legacy missing');
assert(['sw-v156','sw-v1529'].some(key => app.includes(`./sw.js?v=1.5.29-analysis-update-lifecycle&h=${key}`)), 'app should register service worker with v1.5.6+ key');
assert(pkg.qaChecks.includes('node --check src/download/export-progress-view.js'), 'package QA missing export progress syntax check');
assert(pkg.qaChecks.includes('node qa/v156_export_progress_recovery_smoke.js'), 'package QA missing v1.5.6 smoke');
assert(readme.includes('v1.5.6 Export Progress Recovery') && handoff.includes('v1.5.6 export progress recovery'), 'docs missing v1.5.6 notes');
assert(changelog.includes('# v1.5.6 - Export Progress Recovery'), 'CHANGELOG missing v1.5.6 entry');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport) && qaReport.includes('v1.5.6 coverage'), 'QA report missing current PASS target or v1.5.6 coverage');
assert(app.split(/\r?\n/).length < 12950, 'app.js should stay below slim-down line budget');

console.log('PASS v1.5.6 export progress recovery smoke');
