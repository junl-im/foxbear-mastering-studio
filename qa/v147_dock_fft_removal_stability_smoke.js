#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 Dock FFT removal stability smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const app = read('src/app.js');
const sw = read('sw.js');
const spectrum = read('src/ui/spectrum-visualizer.js');
const spectrumCss = read('assets/css/spectrum-visualizer.css');
const mobileCss = read('assets/css/mobile-native.css');
const runtime = read('src/boot/runtime-health.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const changelog = read('CHANGELOG.md');

must(pkg.version === '1.5.26', 'package version should be 1.5.26');
must(pkg.name === 'foxbear-mastering-studio', 'package name should be updated for v1.5.26');
must(index.includes('data-build="1.5.26"'), 'index build marker should be 1.5.26');
must(app.includes("const APP_VERSION = 'Pro v1.5.26'"), 'app version should be Pro v1.5.26');
must(index.includes('1.5.26-engraved-command-header'), 'index should use v1.5.26 cache key');
must(sw.includes('foxbear-shell-v1.5.26-engraved-command-header'), 'service worker should use v1.5.26 cache key');

must(!index.includes('id="bottomPreviewSpectrum"'), 'Dock mini FFT host should be removed from index');
must(!app.includes('bottomPreviewSpectrum'), 'Dock mini FFT element should not be cached in app refs');
must(!app.includes('function renderBottomMiniSpectrum'), 'Dock mini FFT renderer should be removed');
must(!app.includes('renderBottomMiniSpectrum(track'), 'Dock render should not call mini FFT renderer');
must(!app.includes('renderBottomMiniSpectrum(null'), 'Dock teardown should not call mini FFT renderer');
must(!spectrumCss.includes('.bottom-preview-spectrum'), 'Dock mini FFT CSS host selector should be removed');
must(!spectrumCss.includes('.spectrum-mini-panel'), 'Dock mini FFT panel CSS should be removed');

must(spectrum.includes('function renderPanel'), 'detail spectrum panel should remain available');
must(runtime.includes('FoxBearSpectrumVisualizer.renderPanel'), 'runtime health should keep detail spectrum panel check');
must(spectrum.includes('if (!hasRenderableCanvas())') && spectrum.includes('return false;'), 'live FFT should bail out when no canvas is mounted');
must(spectrum.includes('function getDiagnostics'), 'spectrum diagnostics should remain');

must(mobileCss.includes('align the floating settings gear'), 'PC settings gear alignment patch should be present');
must(mobileCss.includes('display: inline-flex !important') && mobileCss.includes('justify-content: center !important'), 'settings gear should be centered by CSS');
must(mobileCss.includes('@media (min-width: 721px)') && mobileCss.includes('env(safe-area-inset-left'), 'desktop settings gear safe-area alignment should be present');

must(matrix.includes('#bottomPreviewSpectrum') && matrix.includes('should not exist'), 'QA matrix should document Dock FFT removal');
must(handoff.includes('Dock FFT removal') && handoff.includes('settings gear'), 'handoff should mention Dock FFT removal and settings gear');
must(notes.includes('Dock mini FFT was removed'), 'project notes should record Dock FFT removal decision');
must(changelog.includes('v1.5.26') && changelog.includes('Dock FFT removal'), 'changelog should include v1.5.26 Dock FFT removal entry');
must(pkg.qaChecks.includes('node qa/v147_dock_fft_removal_stability_smoke.js'), 'v1.5.26 smoke should run in npm check');

console.log('PASS v1.4.26 Dock FFT removal stability smoke');
