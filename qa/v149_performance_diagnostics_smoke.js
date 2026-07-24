#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 performance diagnostics smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const perfCss = read('assets/css/boot/performance-diagnostics.css');
const spectrum = read('src/ui/spectrum-visualizer.js');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const readme = read('README.md');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const version = '1.5.96-modal-focus-memory-diagnostics';

must(pkg.version === '1.5.96', 'package version should be 1.5.96');
must(pkg.name === 'foxbear-mastering-studio', 'package name should use v1.5.96');
must(index.includes('data-build="1.5.96"'), 'index build marker should be 1.5.96');
must(index.includes(`src/boot/performance-diagnostics.js?v=${version}`), 'index should load performance diagnostics JS');
must(index.includes(`assets/css/boot/performance-diagnostics.css?v=${version}`), 'index should load performance diagnostics CSS');
must(sw.includes(`foxbear-shell-v${version}`), 'service worker should use v1.5.96 cache key');
must(sw.includes(`./src/boot/performance-diagnostics.js?v=${version}`), 'service worker should precache performance diagnostics JS');
must(sw.includes(`./assets/css/boot/performance-diagnostics.css?v=${version}`), 'service worker should precache performance diagnostics CSS');
must(pkg.qaChecks.includes('node --check src/boot/performance-diagnostics.js'), 'package should syntax-check diagnostics module');
must(pkg.qaChecks.includes('node qa/v149_performance_diagnostics_smoke.js'), 'package should run v1.5.96 smoke');

must(perf.includes('FoxBearPerformanceDiagnostics'), 'diagnostics global should be exposed');
must(perf.includes('collectSnapshot'), 'diagnostics should expose collectSnapshot');
must(perf.includes('getAudioSnapshot'), 'diagnostics should inspect audio counts');
must(perf.includes('getDomSnapshot'), 'diagnostics should inspect DOM/canvas counts');
must(perf.includes('PerformanceObserver'), 'diagnostics should optionally observe long tasks');
must(perf.includes('foxbear-perf-diagnostics'), 'diagnostics should support localStorage toggle');
must(perf.includes("event.altKey && key === 'p'"), 'diagnostics should support keyboard toggle');
must(perf.includes('FoxBearRuntimeHealth?.getReport'), 'diagnostics should include runtime health summary');
must(perf.includes('FoxBearSpectrumVisualizer?.getDiagnostics'), 'diagnostics should include spectrum summary');
must(perf.includes('FoxBearSiteGuards?.getNavigationExitGuardState'), 'diagnostics should include navigation guard summary');
must(runtime.includes('FoxBearPerformanceDiagnostics.collectSnapshot'), 'runtime health should require diagnostics global');
must(perfCss.includes('.foxbear-perf-panel') && perfCss.includes('[hidden]'), 'diagnostics panel CSS should exist and remain hidden by default');

must(!index.includes('bottomPreviewSpectrum'), 'Dock mini spectrum host should remain removed');
must(!spectrum.includes('renderMini'), 'spectrum visualizer should keep renderMini removed');
must(spectrum.includes('function hasRenderableCanvas'), 'detail-only FFT guard should remain');

must(changelog.includes('v1.5.96') && changelog.includes('Performance diagnostics'), 'changelog should document v1.5.96 diagnostics');
must(handoff.includes('v1.5.96') && handoff.includes('FoxBearPerformanceDiagnostics'), 'handoff should mention diagnostics global');
must(notes.toLowerCase().includes('performance diagnostics'), 'project notes should preserve performance diagnostics guidance');
must(readme.includes('v1.5.96') && readme.includes('Ctrl/Command + Alt + P'), 'README should document diagnostics toggle');
must(matrix.includes('v1.4.26') && matrix.includes('Performance diagnostics'), 'QA matrix should cover v1.5.96 diagnostics');

console.log('PASS v1.4.26 performance diagnostics smoke');
