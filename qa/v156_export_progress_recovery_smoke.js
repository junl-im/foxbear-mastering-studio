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
const zipService = read('src/download/zip-export-service.js');
const zipWorker = read('src/workers/zip-encoder.worker.js');
const css = read('assets/css/export.css');
const updateSafety = read('src/boot/update-safety-service.js');
const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const changelog = read('CHANGELOG.md');
const qaReport = read('qa/QA_REPORT.md');

assert(fs.existsSync('src/download/export-progress-view.js'), 'export progress view file missing');
assert(index.includes('src/download/export-progress-view.js?v=1.5.52-ci-parallel-release-gate&h=export-progress-v156'), 'export progress view not loaded with v1.5.6 cache key');
assert(index.indexOf('src/download/export-guard-service.js') < index.indexOf('src/download/export-progress-view.js'), 'export progress view should load after Export Guard');
assert(index.indexOf('src/download/export-progress-view.js') < index.indexOf('src/ui/download-dialog-view.js'), 'export progress view should load before app UI dependencies');
assert(sw.includes('./src/download/export-progress-view.js?v=1.5.52-ci-parallel-release-gate&h=export-progress-v156'), 'export progress view not precached');
assert(index.includes('assets/css/export.css?v=1.5.52-ci-parallel-release-gate&h=export-progress-v156'), 'export CSS cache key missing');
assert(sw.includes('./assets/css/export.css?v=1.5.52-ci-parallel-release-gate&h=export-progress-v156'), 'export CSS cache key missing from SW');
assert(index.includes(sri('src/download/export-progress-view.js')), 'export progress view SRI mismatch');
assert(index.includes(sri('assets/css/export.css')), 'export CSS SRI mismatch');
assert(index.includes(sri('src/app.js')), 'app SRI mismatch');

['exportProgressPanel','exportProgressTitle','exportProgressStatus','exportProgressBar','exportProgressPercent','exportProgressChecklist','exportProgressOpenDownloads','exportProgressClose'].forEach(id => {
  assert(index.includes(`id="${id}"`), `${id} DOM id missing`);
});
assert(view.includes('FoxBearExportProgressView') && view.includes('begin(plan') && view.includes('update(meta') && view.includes('complete(result') && view.includes('fail(message'), 'export progress view API incomplete');
assert(view.includes('foxbear:export-show-track-downloads') && app.includes('foxbear:export-show-track-downloads'), 'per-track fallback event bridge missing');
assert((app.includes('getZipExportService()?.start') || app.includes('zipService.start({')) && zipService.includes('global.FoxBearExportProgressView'), 'downloadZip should delegate to the ZIP service and progress view');
assert(zipService.includes('progressView?.begin') && zipService.includes('progressView?.update') && zipService.includes('progressView?.complete') && zipService.includes('progressView?.fail'), 'ZIP service does not cover progress states');
assert(zipWorker.includes('zip.generateAsync') && zipWorker.includes('currentFile'), 'ZIP worker progress callback should expose current file');
assert(css.includes('.export-progress-panel') && css.includes('.export-progress-meter') && css.includes('.export-progress-panel.is-failed'), 'export progress CSS missing');
assert(['boot-sri-v156','boot-sri-v1552'].some(key => index.includes(`h=${key}`) && sw.includes(`h=${key}`)), 'boot-critical v1.5.6+ cache key missing');
assert(['update-safety-v156','update-safety-v1552'].some(key => index.includes(`h=${key}`) && sw.includes(`h=${key}`)), 'update safety v1.5.6+ cache key missing');
assert(updateSafety.includes('const EXPECTED_BOOT_KEY = BUILD_INFO.bootRevision ||') && updateSafety.includes('boot-sri-v1552'), 'Update Safety expected boot key should be build-info driven');
assert((sw.includes("foxbear-shell-v1.5.6-export-progress-recovery") || sw.includes("foxbear-shell-v1.5.52-ci-parallel-release-gate")) && sw.includes("foxbear-shell-v1.5.5-update-safety"), 'service worker cache generation/legacy missing');
assert(['sw-v156','sw-v1552'].some(key => app.includes(`./sw.js?v=1.5.52-ci-parallel-release-gate&h=${key}`)), 'app should register service worker with v1.5.6+ key');
assert(pkg.qaChecks.includes('node --check src/download/export-progress-view.js'), 'package QA missing export progress syntax check');
assert(pkg.qaChecks.includes('node qa/v156_export_progress_recovery_smoke.js'), 'package QA missing v1.5.6 smoke');
assert(readme.includes('v1.5.6 Export Progress Recovery') && handoff.includes('v1.5.6 export progress recovery'), 'docs missing v1.5.6 notes');
assert(changelog.includes('# v1.5.6 - Export Progress Recovery'), 'CHANGELOG missing v1.5.6 entry');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport) && qaReport.includes('v1.5.6 coverage'), 'QA report missing current PASS target or v1.5.6 coverage');
assert(app.split(/\r?\n/).length < 12950, 'app.js should stay below slim-down line budget');

console.log('PASS v1.5.6 export progress recovery smoke');
