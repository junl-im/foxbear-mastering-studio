#!/usr/bin/env node
'use strict';
const assert=require('assert'); const fs=require('fs');
const analysis=fs.readFileSync('src/workers/analysis.worker.js','utf8');
const app=fs.readFileSync('src/app.js','utf8');
const detail=fs.readFileSync('src/ui/detail-view.js','utf8');
assert(!fs.existsSync('src/ui/spectrum-visualizer.js'),'v1.6.102 intentionally retires the former v1.6.92 spectrum panel');
assert(!fs.existsSync('assets/css/spectrum-visualizer.css'),'retired spectrum panel CSS must be absent');
assert(!app.includes('renderSpectrumPanel') && !detail.includes('renderSpectrumPanel'),'retired panel must not mount');
assert(analysis.includes('measureFftSpectrumFeatures') && analysis.includes('spectrumProfile') && analysis.includes('spectrumBands'),'mastering spectral analysis must survive UI retirement');
console.log('PASS v1.6.92 historical spectrum mount contract superseded by v1.6.98 UI retirement');
