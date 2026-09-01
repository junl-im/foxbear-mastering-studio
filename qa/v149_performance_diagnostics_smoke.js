#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg=JSON.parse(read('package.json')); const index=read('index.html'); const sw=read('sw.js'); const runtime=read('src/boot/runtime-health.js'); const perf=read('src/boot/performance-diagnostics.js'); const perfCss=read('assets/css/boot/performance-diagnostics.css');
const version='1.7.4-reload-reentry-mode-chooser';
must(pkg.version==='1.7.4','package version');
must(index.includes(`src/boot/performance-diagnostics.js?v=${version}`),'performance diagnostics JS load');
must(sw.includes(`./src/boot/performance-diagnostics.js?v=${version}`),'performance diagnostics SW precache');
['FoxBearPerformanceDiagnostics','collectSnapshot','getAudioSnapshot','getDomSnapshot','PerformanceObserver','foxbear-perf-diagnostics',"event.altKey && key === 'p'",'FoxBearRuntimeHealth?.getReport','FoxBearSiteGuards?.getNavigationExitGuardState'].forEach(t=>must(perf.includes(t),`diagnostics missing ${t}`));
must(runtime.includes('FoxBearPerformanceDiagnostics.collectSnapshot'),'runtime health should require diagnostics');
must(perfCss.includes('.foxbear-perf-panel') && perfCss.includes('[hidden]'),'diagnostics panel CSS missing');
must(!perf.includes('FoxBearSpectrumVisualizer') && !perf.includes('spectrumPanels'),'diagnostics must not track retired spectrum UI');
console.log('PASS performance diagnostics after spectrum UI retirement');
