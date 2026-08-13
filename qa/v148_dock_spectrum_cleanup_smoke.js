#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 Dock spectrum cleanup smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const app = read('src/app.js');
const sw = read('sw.js');
const runtime = read('src/boot/runtime-health.js');
const spectrum = read('src/ui/spectrum-visualizer.js');
const spectrumCss = read('assets/css/spectrum-visualizer.css');
const mobileCss = read('assets/css/mobile-native.css');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const readme = read('README.md');

const version = '1.6.94-release-integrity-hardening';

must(pkg.version === '1.6.94', 'package version should be 1.6.94');
must(pkg.name === 'foxbear-mastering-studio', 'package name should be v1.6.94');
must(index.includes('data-build="1.6.94"'), 'index build marker should be 1.6.94');
must(app.includes("const APP_VERSION = 'Pro v1.6.94'"), 'app version should be Pro v1.6.94');
must(index.includes(`src/ui/spectrum-visualizer.js?v=${version}`), 'index should load spectrum visualizer with v1.6.94 key');
must(sw.includes(`foxbear-shell-v${version}`), 'service worker should use v1.6.94 cache key');
must(sw.includes(`./src/ui/spectrum-visualizer.js?v=${version}`), 'service worker should precache v1.6.94 spectrum visualizer');

must(!index.includes('id="bottomPreviewSpectrum"'), 'Dock mini spectrum host should remain removed');
must(!app.includes('bottomPreviewSpectrum'), 'app should not cache Dock mini spectrum refs');
must(!app.includes('renderBottomMiniSpectrum'), 'Dock mini spectrum renderer should remain removed');
must(!spectrum.includes('function renderMini'), 'spectrum visualizer should not expose Dock mini renderer');
must(!spectrum.includes('miniCanvases'), 'spectrum visualizer should not retain mini canvas set');
must(!runtime.includes('FoxBearSpectrumVisualizer.renderMini'), 'runtime health should not require removed renderMini API');
must(!spectrumCss.includes('.spectrum-mini-panel') && !spectrumCss.includes('.bottom-preview-spectrum'), 'Dock spectrum CSS selectors should remain removed');

must(spectrum.includes('function renderPanel'), 'detail spectrum panel should remain available');
must(runtime.includes('FoxBearSpectrumVisualizer.renderPanel'), 'runtime health should require detail spectrum panel');
must(spectrum.includes('function hasRenderableCanvas'), 'spectrum should keep mounted-canvas guard');
must(spectrum.includes('return Boolean(state.canvas && state.canvas.isConnected !== false)'), 'hasRenderableCanvas should be detail-panel only');
must(spectrum.includes('if (!hasRenderableCanvas())') && spectrum.includes('return false;'), 'live FFT should skip connection when no detail panel canvas is mounted');
must(spectrum.includes('function getDiagnostics'), 'spectrum diagnostics should remain');
must(!spectrum.includes('miniCanvasCount'), 'diagnostics should not report removed mini canvases');

must(mobileCss.includes('display: inline-flex !important') && mobileCss.includes('justify-content: center !important'), 'settings gear centering CSS should remain');
must(matrix.includes('runtime health does not require `renderMini`'), 'matrix should document renderMini cleanup');
must(changelog.includes('v1.6.94') && changelog.includes('renderMini'), 'changelog should document v1.6.94 renderMini cleanup');
must(handoff.includes('v1.6.94') && handoff.includes('detail-only FFT'), 'handoff should mention detail-only FFT');
must(notes.includes('renderMini') && notes.includes('removed'), 'project notes should record renderMini removal');
must(readme.includes('v1.6.94') && readme.includes('detail-only'), 'README should summarize v1.6.94 detail-only FFT');
must(pkg.qaChecks.includes('node qa/v148_dock_spectrum_cleanup_smoke.js'), 'package should run v1.6.94 smoke');

console.log('PASS v1.4.26 Dock spectrum cleanup smoke');
