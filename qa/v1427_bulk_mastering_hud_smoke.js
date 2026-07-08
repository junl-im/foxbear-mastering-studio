#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL bulk mastering HUD smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const hud = read('src/ui/bulk-import-hud-view.js');
const css = read('assets/css/bulk-import-hud.css');

assert(pkg.qaChecks.includes('node qa/v1427_bulk_mastering_hud_smoke.js'), 'package QA should include bulk mastering HUD smoke');
assert(hud.includes('phase: \'import\''), 'HUD state should track import/mastering phase');
assert(hud.includes('function beginMasteringBatch'), 'HUD module should expose a mastering batch starter');
assert(hud.includes('track.bulkMasteringBatchId = batchId'), 'mastering tracks should be assigned to the active HUD batch');
assert(hud.includes("summary.phase === 'mastering'"), 'HUD rendering should branch for mastering phase');
assert(hud.includes('마스터링 대기'), 'HUD should label ready tracks as mastering pending');
assert(hud.includes('대량 마스터링 HUD'), 'HUD should show a mastering-specific title');
assert(hud.includes('summary.phase === \'mastering\' && summary.count && !summary.complete'), 'mastering HUD should remain visible until the batch completes');

assert(app.includes('function beginBulkMasteringHudBatch'), 'app should bridge mastering batches into the bulk HUD');
assert(app.includes("view.beginMasteringBatch(items, options)"), 'app bridge should prefer the new mastering HUD API');
assert(app.includes("beginBulkMasteringHudBatch(candidates, { source: options.source || 'selected'"), 'selected-track mastering should start a HUD batch');
assert(app.includes("beginBulkMasteringHudBatch(candidates, { source: 'all'"), 'master-all should start a HUD batch');
assert(app.includes("if (track.bulkMasteringBatchId || track.bulkImportBatchId) updateBulkImportHud();"), 'mastering progress should refresh the large HUD directly');
assert(app.includes('markMasteringQueueStart') && app.includes('updateBulkImportHud();'), 'mastering queue state changes should refresh the HUD');

assert(css.includes('.bulk-import-hud[data-phase="mastering"]'), 'CSS should include a mastering visual phase');
assert(css.includes('.bulk-import-row.is-processing .bulk-import-row-state'), 'CSS should style the active mastering row state');

console.log('PASS bulk mastering HUD smoke');
