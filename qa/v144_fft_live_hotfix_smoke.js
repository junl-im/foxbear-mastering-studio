#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.4 FFT live hotfix smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.4.4-fft-live-hotfix';
const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const spectrum = read('src/ui/spectrum-visualizer.js');
const app = read('src/app.js');
const runtime = read('src/boot/runtime-health.js');

must(pkg.version === '1.4.4', 'package version should be 1.4.4');
must(app.includes("const APP_VERSION = 'Pro v1.4.4'"), 'app version should be Pro v1.4.4');
must(index.includes('data-build="1.4.4"'), 'index build marker should be 1.4.4');
must(index.includes(`src/ui/spectrum-visualizer.js?v=${version}`), 'index should load spectrum visualizer with v1.4.4 cache key');
must(sw.includes(`./src/ui/spectrum-visualizer.js?v=${version}`), 'service worker should precache spectrum visualizer with v1.4.4 key');
must(sw.includes(`foxbear-shell-v${version}`), 'service worker cache should use v1.4.4 key');
must(runtime.includes('FoxBearSpectrumVisualizer.renderMini'), 'runtime health should require mini spectrum API');

must(spectrum.includes("VISUALIZER_VERSION = '1.4.4-fft-live-hotfix'"), 'spectrum visualizer version should be v1.4.4 hotfix');
must(spectrum.includes('function hasRenderableCanvas'), 'visualizer should detect panel or mini canvases');
must(spectrum.includes('state.miniCanvases.size > 0'), 'mini-only mode should count as renderable');
must(!spectrum.includes('!state.live || !state.analyser || !state.data || !state.canvas'), 'live loop must not require the full detail canvas');
must(spectrum.includes('drawEveryCanvas(values'), 'live loop should draw to all canvases');
must(spectrum.includes('function scheduleFrame') && spectrum.includes('setTimeout(callback, 33)'), 'visualizer should support RAF fallback');
must(spectrum.includes('function cancelFrame') && spectrum.includes('clearTimeout'), 'visualizer should cancel RAF fallback');
must(spectrum.includes('function resumeContext') && spectrum.includes('resumeContext(state.context).finally(() => startLoop())'), 'visualizer should resume suspended AudioContext before live loop');
must(spectrum.includes('renderMini') && spectrum.includes('state.miniCanvases.add(canvas)'), 'renderMini should register mini canvas');

must(app.includes('function renderBottomMiniSpectrum'), 'Dock mini spectrum renderer missing');
must(app.includes('getActiveAudio: () => getActiveSpectrumAudioForTrack(track)'), 'Dock mini spectrum should route active track audio');
must(pkg.qaChecks.includes('node qa/v144_fft_live_hotfix_smoke.js'), 'v1.4.4 smoke should run in npm check');

console.log('PASS v1.4.4 FFT live hotfix smoke');
