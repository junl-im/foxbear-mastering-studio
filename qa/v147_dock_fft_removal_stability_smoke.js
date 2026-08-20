#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg=JSON.parse(read('package.json')); const index=read('index.html'); const app=read('src/app.js'); const runtime=read('src/boot/runtime-health.js'); const matrix=read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md'); const mobileCss=read('assets/css/mobile-native.css');
must(pkg.version==='1.6.112','package version');
must(!index.includes('bottomPreviewSpectrum') && !app.includes('bottomPreviewSpectrum') && !app.includes('renderBottomMiniSpectrum'),'Dock FFT must remain absent');
must(!exists('src/ui/spectrum-visualizer.js') && !exists('assets/css/spectrum-visualizer.css'),'detail spectrum UI must also be retired');
must(!runtime.includes('FoxBearSpectrumVisualizer'),'runtime health must not require spectrum UI');
must(matrix.includes('#bottomPreviewSpectrum') && matrix.includes('should not exist'),'historical browser matrix should preserve Dock FFT absence contract');
must(mobileCss.length>0,'mobile CSS should remain available');
console.log('PASS Dock/detail spectrum UI retirement stability');
