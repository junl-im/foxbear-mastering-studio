#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg=JSON.parse(read('package.json')); const index=read('index.html'); const sw=read('sw.js'); const guards=read('src/security/site-guards.js'); const runtime=read('src/boot/runtime-health.js');
must(pkg.version==='1.6.102','package version');
must(index.includes('data-build="1.6.102"'),'index build');
must(!exists('src/ui/spectrum-visualizer.js'),'retired spectrum module must stay deleted');
must(!sw.includes('spectrum-visualizer'),'SW must not precache retired spectrum module');
['confirmOpen','setTimeout(tryPushExitGuardState, 0)','function getNavigationExitGuardState'].forEach(t=>must(guards.includes(t),`exit guard stability missing ${t}`));
must(runtime.includes('FoxBearSiteGuards.getNavigationExitGuardState'),'runtime health should keep exit guard diagnostics');
must(!runtime.includes('FoxBearSpectrumVisualizer'),'runtime health should not keep retired spectrum diagnostics');
console.log('PASS stability polish with retired spectrum diagnostics');
