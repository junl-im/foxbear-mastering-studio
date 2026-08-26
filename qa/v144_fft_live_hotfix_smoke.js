#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg=JSON.parse(read('package.json')); const index=read('index.html'); const sw=read('sw.js'); const app=read('src/app.js'); const runtime=read('src/boot/runtime-health.js'); const analysis=read('src/workers/analysis.worker.js');
must(pkg.version==='1.7.0','package version');
must(!exists('src/ui/spectrum-visualizer.js'),'live FFT visualizer module must be deleted');
must(!index.includes('spectrum-visualizer') && !sw.includes('spectrum-visualizer'),'live FFT visualizer must not load or precache');
must(!runtime.includes('FoxBearSpectrumVisualizer'),'runtime health must not require retired visualizer');
must(!app.includes('createSpectrumAnalyserTap') && !app.includes('registerExternalSpectrumAnalyser'),'visualizer-only analyser taps must be removed');
must(analysis.includes('measureFftSpectrumFeatures') && analysis.includes('spectrumProfile'),'analysis FFT must remain for mastering decisions');
console.log('PASS former live FFT UI retired while mastering FFT analysis remains');
