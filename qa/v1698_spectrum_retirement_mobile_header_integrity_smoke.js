#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const detail = read('src/ui/detail-view.js');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const uiMode = read('assets/css/ui-mode.css');
const header = read('assets/css/header-command-bar.css');
const analysisWorker = read('src/workers/analysis.worker.js');

assert.strictEqual(pkg.version, '1.6.111');
assert(!exists('src/ui/spectrum-visualizer.js'), 'retired AI spectrum visualizer JS must be deleted');
assert(!exists('assets/css/spectrum-visualizer.css'), 'retired AI spectrum visualizer CSS must be deleted');
assert(!index.includes('spectrum-visualizer'), 'index must not load retired spectrum UI');
assert(!sw.includes('spectrum-visualizer'), 'service worker must not precache retired spectrum UI');
assert(!pkg.qaChecks.includes('node --check src/ui/spectrum-visualizer.js'), 'QA must not syntax-check a deleted module');
assert(!runtime.includes('FoxBearSpectrumVisualizer'), 'runtime health must not require retired spectrum globals');
assert(!perf.includes('FoxBearSpectrumVisualizer') && !perf.includes('spectrumPanels'), 'performance diagnostics must not depend on retired spectrum UI');
assert(!app.includes('FoxBearSpectrumVisualizer') && !app.includes('renderSpectrumPanel') && !app.includes('createSpectrumAnalyserTap'), 'app must remove spectrum UI/audio analyser integration');
assert(!detail.includes('renderSpectrumPanel'), 'detail view must not mount retired AI spectrum panel');
assert(!uiMode.includes('body[data-ui-mode="ai"] .brand-command-device,'), 'mobile AI mode must not hide compatibility device token');
assert(header.includes('.brand-command-device-icons'), 'header must retain device icon styling');
assert(index.includes('brand-command-device-icons') && index.includes('is-screen') && index.includes('is-phone'), 'header must retain PC/mobile icons');
assert(analysisWorker.includes('spectrumBands') && analysisWorker.includes('spectrumProfile'), 'mastering spectral analysis data must remain available after UI retirement');
console.log('PASS v1.6.98 spectrum retirement + mobile header device icon integrity');
