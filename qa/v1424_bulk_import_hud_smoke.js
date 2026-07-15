#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.4.26 bulk import HUD smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const bulkHud = read('src/ui/bulk-import-hud-view.js');
const index = read('index.html');
const css = read('assets/css/bulk-import-hud.css');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

assert(pkg.version === '1.5.14', 'package version should be 1.5.14');
assert(pkg.name === 'foxbear-mastering-studio', 'package name should be v1-4-26');
assert(pkg.qaChecks.includes('node qa/v1424_bulk_import_hud_smoke.js'), 'package QA should include v1.5.14 HUD smoke');
assert(index.includes('id="bulkImportHud"'), 'index should include bulk import HUD root');
assert(index.includes('id="bulkImportHudList"'), 'index should include scrollable bulk import HUD list');
assert(index.includes('aria-label="대량 업로드 곡별 분석 진행 상황"'), 'HUD list should have an accessible label');
assert(index.includes('data-build="1.5.14"'), 'index build marker should be v1.5.14');

assert(app.includes('SAFE_BULK_IMPORT_HUD_MIN_TRACKS'), 'app should normalize HUD min track threshold');
assert(app.includes('function beginBulkImportHudBatch'), 'app should call HUD module for multi import');
assert(app.includes('function updateBulkImportHud'), 'app should refresh bulk import HUD through wrapper');
assert(app.includes('function getBulkImportHudSnapshot'), 'app should expose HUD snapshot fallback');
assert(app.includes('beginBulkImportHudBatch(addedTracks, { largeBatch, skippedByLimit })'), 'handleFiles should create HUD batch before analysis starts');
assert(app.includes('if (!totalWorking)') && app.includes('updateBulkImportHud();') && app.includes('return snapshot;'), 'queue status should update HUD on completion');
assert(app.includes('updateBulkImportHud();\n    updateMobileNativeUi();'), 'renderAll should refresh HUD');
assert(bulkHud.includes("const VIEW_VERSION = '1.5.14-github-desktop-handoff-preflight'"), 'HUD module should carry v1.5.14 version');
assert(bulkHud.includes('const hudState'), 'HUD module should keep HUD batch state');
assert(bulkHud.includes('function beginBatch'), 'HUD module should start a batch');
assert(bulkHud.includes('function update()'), 'HUD module should render/update the HUD');
assert(bulkHud.includes('function getSnapshot'), 'HUD module should expose a snapshot');
assert(bulkHud.includes('global.FoxBearBulkImportHudView'), 'HUD module should expose view global');
assert(bulkHud.includes('global.FoxBearBulkImportHud'), 'HUD module should expose diagnostics global');
assert(bulkHud.includes('track.bulkImportBatchId = batchId'), 'tracks should be assigned to a HUD batch');
assert(bulkHud.includes('track.bulkImportOrder = index + 1'), 'tracks should keep visible row order');
assert(index.includes('src/ui/bulk-import-hud-view.js?v=1.5.14-github-desktop-handoff-preflight'), 'index should load bulk import HUD module');

assert(index.includes('assets/css/bulk-import-hud.css?v=1.5.14-github-desktop-handoff-preflight'), 'index should load bulk import HUD CSS');
assert(css.includes('.bulk-import-hud'), 'CSS should style bulk import HUD');
assert(css.includes('.bulk-import-hud-list'), 'CSS should style bulk import list');
assert(css.includes('overflow: auto'), 'bulk import list should be scrollable');
assert(css.includes('max-height: min(42dvh, 390px)'), 'bulk import list should be vertically bounded');
assert(css.includes('.bulk-import-row'), 'CSS should style per-track rows');
assert(css.includes('body.bottom-preview-active .bulk-import-hud'), 'HUD should avoid the Dock area');
assert(css.includes('--foxbear-processing-hud-height'), 'HUD should stack with existing processing HUD');

assert(runtime.includes('FoxBearBulkImportHud.getSnapshot'), 'runtime health should require bulk import HUD diagnostics');
assert(perf.includes('bulkImportHud = safeCall'), 'performance diagnostics should collect bulk import HUD state');
assert(perf.includes('bulk-import-hud-active'), 'performance diagnostics should warn while HUD is active');
assert(perf.includes('bulkImportHud:'), 'performance summary should expose HUD state');

assert(matrix.includes('Bulk Import HUD'), 'matrix should document Bulk Import HUD');
assert(matrix.includes('35곡'), 'matrix should include 35-track scenario');
assert(matrix.includes('스크롤'), 'matrix should cover scrollable list behavior');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport), 'QA report should be updated for v1.5.14');
assert(changelog.includes('v1.5.14'), 'changelog should mention v1.5.14');

console.log('PASS v1.4.26 bulk import HUD smoke');
