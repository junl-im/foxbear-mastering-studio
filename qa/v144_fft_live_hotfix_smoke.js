#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 FFT live hotfix smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.6.76-download-viewport-runtime-fault-diagnostics';
const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const spectrum = read('src/ui/spectrum-visualizer.js');
const app = read('src/app.js');
const runtime = read('src/boot/runtime-health.js');

must(pkg.version === '1.6.76', 'package version should be 1.6.76');
must(app.includes("const APP_VERSION = 'Pro v1.6.76'"), 'app version should be Pro v1.6.76');
must(index.includes('data-build="1.6.76"'), 'index build marker should be 1.6.76');
must(index.includes(`src/ui/spectrum-visualizer.js?v=${version}`), 'index should load spectrum visualizer with v1.6.76 cache key');
must(sw.includes(`./src/ui/spectrum-visualizer.js?v=${version}`), 'service worker should precache spectrum visualizer with v1.6.76 key');
must(sw.includes(`foxbear-shell-v${version}`), 'service worker cache should use v1.6.76 key');
must(runtime.includes('FoxBearSpectrumVisualizer.renderPanel'), 'runtime health should require detail spectrum API');

must(spectrum.includes("VISUALIZER_VERSION = '1.6.76-download-viewport-runtime-fault-diagnostics'"), 'spectrum visualizer version should be v1.6.76 hotfix');
must(spectrum.includes('function hasRenderableCanvas'), 'visualizer should detect mounted spectrum canvases');
must(spectrum.includes('if (!hasRenderableCanvas())'), 'live FFT should skip analyser connection when no spectrum canvas is mounted');
must(!spectrum.includes('!state.live || !state.analyser || !state.data || !state.canvas'), 'live loop must not require the full detail canvas');
must(spectrum.includes('drawEveryCanvas(values'), 'live loop should draw to all canvases');
must(spectrum.includes('function scheduleFrame') && spectrum.includes('setTimeout') && spectrum.includes('getFrameDelay'), 'visualizer should support RAF/timeout fallback');
must(spectrum.includes('function cancelFrame') && spectrum.includes('clearTimeout'), 'visualizer should cancel RAF fallback');
must(spectrum.includes('function resumeContext') && spectrum.includes('resumeContext(state.context).finally(() => startLoop())'), 'visualizer should resume suspended AudioContext before live loop');
must(!app.includes('function renderBottomMiniSpectrum'), 'Dock mini spectrum renderer should be removed in v1.6.76');
must(!app.includes('bottomPreviewSpectrum'), 'Dock mini spectrum ref should be removed in v1.6.76');
must(pkg.qaChecks.includes('node qa/v144_fft_live_hotfix_smoke.js'), 'v1.6.76 smoke should run in npm check');

console.log('PASS v1.4.26 FFT live hotfix smoke');
