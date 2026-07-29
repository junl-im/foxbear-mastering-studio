#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const app = read('src/app.js');
const hud = read('src/ui/bulk-import-hud-view.js');
const orchestrator = read('src/audio/mastering-orchestrator-service.js');
const hudCss = read('assets/css/bulk-import-hud.css');
const dialog = read('src/ui/download-dialog-view.js');
const downloadCss = read('assets/css/download-dialog.css');
const browserSpec = read('qa/browser/v1574-mobile-download-batch-controls-visual.spec.js');

assert.strictEqual(pkg.version, '1.6.34', 'package version should be v1.6.34');
for (const id of ['bulkImportHudPause', 'bulkImportHudSkip', 'bulkImportHudSummary']) {
  assert(index.includes(`id="${id}"`), `v1.6.34 bulk control missing: ${id}`);
}
assert(index.includes('<option value="skipped">건너뜀</option>'), 'skipped result filter missing');
assert(app.includes('pauseActiveMasteringBatch') && app.includes('resumeActiveMasteringBatch'), 'pause/resume app bridge missing');
assert(app.includes('skipCurrentMasteringTrack') && app.includes('movePendingMasteringTrack'), 'skip/reorder app bridge missing');
assert(orchestrator.includes('pauseActiveBatch') && orchestrator.includes('resumeActiveBatch'), 'orchestrator pause controls missing');
assert(orchestrator.includes('skipCurrentTrack') && orchestrator.includes('movePendingTrack'), 'orchestrator skip/reorder controls missing');
const viewVersion = hud.match(/const VIEW_VERSION = '([^']+)'/)?.[1] || '';
assert(viewVersion.startsWith(`${pkg.version}-`), `HUD ${pkg.version} contract missing`);
assert(hud.includes('renderBatchSummary') && hud.includes('bulk-import-row-order-btn'), 'summary or queue ordering UI missing');
assert(hudCss.includes('.bulk-import-hud-pause') && hudCss.includes('.bulk-import-hud-skip'), 'pause/skip styles missing');
assert(hudCss.includes('.bulk-import-row-order-actions') && hudCss.includes('.bulk-import-hud-summary'), 'queue/summary styles missing');
assert(dialog.includes('download-format-families') && dialog.includes('MP3 품질 선택') && dialog.includes('WAV 품질 선택'), 'two-stage format picker missing');
assert(dialog.includes('download-options-panel-v1574') && dialog.includes('formatPicker'), 'v1.6.34 download panel contract missing');
assert(/height: min\((?:94dvh, 820px|96dvh, 860px)\)/.test(downloadCss) && downloadCss.includes('position: sticky') && downloadCss.includes('overflow-y: auto'), 'mobile viewport-contained/sticky action layout missing');
assert(browserSpec.includes('375') && browserSpec.includes('screenshot') && browserSpec.includes('download-format-family'), 'mobile visual regression contract missing');

(async () => {
  const sandbox = { window: null, console, AbortController, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  vm.runInNewContext(orchestrator, sandbox, { filename: 'mastering-orchestrator-service.js' });
  const starts = [];
  const outcomes = [];
  const queueOrders = [];
  const pauseEvents = [];
  const runner = sandbox.window.FoxBearMasteringOrchestratorService.createMasteringBatchRunner({
    beginHudBatch: items => ({ batchId: `v1574-${items.length}` }),
    onTrackStart: track => starts.push(track.id),
    onTrackComplete: (track, meta) => outcomes.push([track.id, meta.outcome]),
    onQueueChanged: meta => queueOrders.push(meta.items.map(track => track.id)),
    onPauseChanged: meta => pauseEvents.push(Boolean(meta.paused)),
    masterTrack: (track, calledFromBatch, options) => new Promise(resolve => {
      const timer = setTimeout(() => resolve(true), 35);
      options.signal?.addEventListener?.('abort', () => {
        clearTimeout(timer);
        resolve(false);
      }, { once: true });
    })
  });
  const tracks = ['a', 'b', 'c', 'd'].map(id => ({ id }));
  const running = runner.runBatch(tracks);
  await new Promise(resolve => setTimeout(resolve, 6));
  assert.strictEqual(runner.pauseActiveBatch('qa-pause'), true, 'pause request should be accepted');
  assert.strictEqual(runner.movePendingTrack('d', -1), true, 'pending track should move up once');
  assert.strictEqual(runner.movePendingTrack('d', -1), true, 'pending track should move up twice');
  assert.strictEqual(runner.skipCurrentTrack('qa-skip'), true, 'current track skip should be accepted');
  await new Promise(resolve => setTimeout(resolve, 12));
  assert.deepStrictEqual(starts, ['a'], 'pause should stop the next track from starting');
  assert.strictEqual(runner.getActiveBatchSnapshot().paused, true, 'active batch should report paused state');
  assert.strictEqual(runner.resumeActiveBatch('qa-resume'), true, 'resume should be accepted');
  const result = await running;
  assert.strictEqual(result.skipped, 1, 'one current track should be skipped');
  assert.strictEqual(result.completed, 3, 'remaining tracks should complete');
  assert.deepStrictEqual(starts, ['a', 'd', 'b', 'c'], 'reordered pending track should run next');
  assert.deepStrictEqual(outcomes[0], ['a', 'skipped'], 'active track should settle as skipped');
  assert.deepStrictEqual(queueOrders.at(-1), ['a', 'd', 'b', 'c'], 'queue order callback should expose final order');
  assert.deepStrictEqual(pauseEvents, [true, false], 'pause state changes should be reported');
  console.log('PASS v1.5.74 bulk pause/skip/reorder + mobile download smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
