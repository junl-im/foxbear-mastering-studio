#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg=JSON.parse(read('package.json')); const app=read('src/app.js'); const index=read('index.html'); const sw=read('sw.js'); const translation=read('src/audio/preview-translation-service.js');
must(pkg.version==='1.6.105','package version');
must(index.includes('1.6.105-header-dock-css-ownership-hardening'),'asset version');
must(sw.includes('foxbear-shell-v1.6.105-header-dock-css-ownership-hardening'),'cache version');
must(!exists('src/ui/spectrum-visualizer.js'),'spectrum visualizer must stay deleted');
must(!app.includes('createSpectrumAnalyserTap') && !app.includes('registerExternalSpectrumAnalyser') && !app.includes('spectrumAnalyser'),'visualizer analyser plumbing must be absent');
must(translation.includes('masterGain.connect(context.destination);'),'preview translation must connect directly to destination after analyser retirement');
must(!translation.includes('createAnalyser') && !translation.includes('analyser,'),'preview translation must not retain dead analyser state');
console.log('PASS stability audit after spectrum analyser retirement');
