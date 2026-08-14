#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg=JSON.parse(read('package.json')); const index=read('index.html'); const sw=read('sw.js'); const app=read('src/app.js'); const runtime=read('src/boot/runtime-health.js');
must(pkg.version==='1.6.99','package version');
must(!index.includes('spectrum-visualizer') && !sw.includes('spectrum-visualizer'),'spectrum assets must remain out of boot/cache graph');
must(!app.includes('bottomPreviewSpectrum') && !app.includes('renderBottomMiniSpectrum') && !app.includes('renderSpectrumPanel'),'all spectrum UI renderers must remain removed');
must(!runtime.includes('FoxBearSpectrumVisualizer'),'runtime health must not retain spectrum globals');
must(!exists('src/ui/spectrum-visualizer.js') && !exists('assets/css/spectrum-visualizer.css'),'retired spectrum assets must be physically absent');
console.log('PASS spectrum UI cleanup remains complete');
