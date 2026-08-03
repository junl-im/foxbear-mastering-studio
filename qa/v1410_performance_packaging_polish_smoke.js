#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 performance packaging polish smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('manifest.webmanifest'));
const index = read('index.html');
const sw = read('sw.js');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const perfCss = read('assets/css/boot/performance-diagnostics.css');
const overwriteTool = read('tools/create-overwrite-zip.sh');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const readme = read('README.md');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const version = '1.6.49';
const assetVersion = '1.6.49-download-variant-cache-reuse';

must(pkg.version === version, 'package version should be 1.6.49');
must(pkg.name === 'foxbear-mastering-studio', 'package name should use v1.6.49');
must(manifest.version === version, 'manifest version should be 1.6.49');
must(index.includes('data-build="1.6.49"'), 'index build marker should be v1.6.49');
must(index.includes(`src/boot/performance-diagnostics.js?v=${assetVersion}`), 'index should load diagnostics with new cache key');
must(sw.includes(`foxbear-shell-v${assetVersion}`), 'service worker should use v1.6.49 cache key');
must(sw.includes(`./src/boot/performance-diagnostics.js?v=${assetVersion}`), 'service worker should precache diagnostics JS');
must(sw.includes(`./assets/css/boot/performance-diagnostics.css?v=${assetVersion}`), 'service worker should precache diagnostics CSS');

must(perf.includes('const DIAGNOSTICS_VERSION = \'1.6.49-download-variant-cache-reuse\''), 'diagnostics version should be v1.6.49');
must(perf.includes('PANEL_HIDDEN_REFRESH_MS'), 'diagnostics should throttle hidden-tab refresh');
must(perf.includes('global.setTimeout'), 'diagnostics panel should use adaptive timeout scheduling');
must(!perf.includes('setInterval(() => refreshPanel'), 'diagnostics panel should not use fixed interval refresh');
must(perf.includes('function summarizeSnapshot'), 'diagnostics should summarize warning causes');
must(perf.includes('getSummary'), 'diagnostics should expose getSummary');
must(perf.includes('serializeSnapshot'), 'diagnostics should expose serializeSnapshot');
must(perf.includes('copySnapshotToClipboard'), 'diagnostics should expose copy helper');
must(perf.includes('clearHistory'), 'diagnostics should expose clearHistory');
must(perf.includes('multiple-audible-audio'), 'summary should flag multiple audible audio');
must(perf.includes('spectrum-live-without-panel'), 'summary should flag hidden spectrum loops');
must(perf.includes('visibilitychange'), 'diagnostics should reschedule when visibility changes');
must(runtime.includes('FoxBearPerformanceDiagnostics.getSummary'), 'runtime health should require diagnostics getSummary');
must(perfCss.includes('.foxbear-perf-panel-actions'), 'diagnostics CSS should style action buttons');
must(perfCss.includes('.foxbear-perf-panel-button'), 'diagnostics CSS should style panel buttons');

must(overwriteTool.includes('package.json') && overwriteTool.includes("'v' + (p.version || 'dev')"), 'overwrite package default should derive from package.json');
must(pkg.qaChecks.includes('node qa/v1410_performance_packaging_polish_smoke.js'), 'package should run v1.6.49 smoke');
must(changelog.includes('v1.6.49') && changelog.includes('Packaging'), 'changelog should document v1.6.49 packaging polish');
must(handoff.includes('v1.6.49') && handoff.includes('getSummary'), 'handoff should document diagnostics summary');
must(notes.includes('adaptive'), 'project notes should preserve adaptive diagnostics refresh guidance');
must(readme.includes('v1.6.49') && readme.includes('복사'), 'README should mention diagnostics copy action');
must(matrix.includes('v1.4.26') && matrix.includes('Performance diagnostics'), 'QA matrix should document v1.6.49');

console.log('PASS v1.4.26 performance packaging polish smoke');
