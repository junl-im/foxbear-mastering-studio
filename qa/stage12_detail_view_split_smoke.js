#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const fail = message => {
  console.error(`FAIL stage12_detail_view_split_smoke: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

const app = read('src/app.js');
const detail = read('src/ui/detail-view.js');
const index = read('index.html');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');

assert(detail.includes('FoxBearDetailView'), 'detail-view module should export FoxBearDetailView');
assert(detail.includes('function renderDetail(options = {}, deps = {})'), 'detail-view should own renderDetail implementation');
assert(detail.includes('renderMasterPreviewQuickBarView'), 'master preview quick bar should be moved to detail-view');
assert(detail.includes('renderAiMasteringCardView'), 'AI mastering card should be moved to detail-view');
assert(detail.includes('makeAiMasteringMetric'), 'AI mastering metric DOM helper should live in detail-view');
assert(detail.includes('global.FoxBearDetailView = Object.freeze'), 'detail-view export should be frozen');

assert(app.includes('function getDetailView()'), 'app should access detail module through getDetailView');
assert(app.includes('function getDetailViewDeps()'), 'app should provide explicit detail view dependencies');
assert(app.includes('return getDetailView().renderDetail(options, getDetailViewDeps())'), 'renderDetail wrapper should delegate to detail-view');
assert(!app.includes('const empty = document.createElement(\'div\');\n        empty.className = \'empty\';\n        empty.textContent = \'트랙을 선택하면 정밀 비교와 진행 상태가 표시됩니다.\''), 'large renderDetail DOM body should not remain in app.js');

const detailIndex = index.indexOf('src/ui/detail-view.js');
const appIndex = index.indexOf('src/app.js');
assert(detailIndex > -1, 'index should load detail-view.js');
assert(appIndex > detailIndex, 'detail-view.js should load before app.js');
assert(index.includes('src/ui/detail-view.js') && index.includes('integrity='), 'detail-view script should be present alongside SRI-managed scripts');
assert(sw.includes('src/ui/detail-view.js'), 'service worker should precache detail-view.js');
assert(/stage(?:12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28)/.test(sw) || sw.includes('foxbear-shell-v1.6.4-incident-callable-csp-recovery'), 'service worker cache should be bumped to stage12');
assert(pkg.qaChecks.includes('node --check src/ui/detail-view.js'), 'package QA should syntax-check detail-view.js');
assert(pkg.qaChecks.includes('node qa/stage12_detail_view_split_smoke.js'), 'package QA should include stage12 smoke');
assert(changelog.includes('Stage12') && handoff.includes('Stage12') && notes.includes('Stage12'), 'project docs should mention Stage12');

console.log('PASS stage12 detail view split smoke');
