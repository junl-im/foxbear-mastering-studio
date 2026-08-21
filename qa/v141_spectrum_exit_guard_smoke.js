#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const runtime = read('src/boot/runtime-health.js');
const siteGuards = read('src/security/site-guards.js');
const detailView = read('src/ui/detail-view.js');
const changelog = read('CHANGELOG.md');
must(pkg.version === '1.6.113', 'package version should be 1.6.113');
must(!exists('src/ui/spectrum-visualizer.js') && !exists('assets/css/spectrum-visualizer.css'), 'retired spectrum UI assets must stay deleted');
must(!index.includes('spectrum-visualizer') && !sw.includes('spectrum-visualizer'), 'retired spectrum UI must not be booted or precached');
must(!runtime.includes('FoxBearSpectrumVisualizer'), 'runtime health must not require retired spectrum UI');
must(!app.includes('FoxBearSpectrumVisualizer') && !app.includes('renderSpectrumPanel'), 'app must not remount spectrum UI');
must(!detailView.includes('renderSpectrumPanel'), 'detail view must not render spectrum UI');
['installNavigationExitGuard','beforeunload','popstate','foxbearExitGuard','뒤로가기를 누르면 프로그램을 닫고 현재 작업 화면을 나갑니다. 맞습니까?'].forEach(token => must(siteGuards.includes(token), `exit guard should include ${token}`));
must(app.includes('function hasMeaningfulWorkspaceState()'), 'workspace exit-state guard missing');
must(changelog.includes('v1.6.113') && changelog.includes('Spectrum retirement'), 'changelog should document spectrum retirement');
console.log('PASS legacy spectrum/exit-guard contract migrated to v1.6.98 retirement');
