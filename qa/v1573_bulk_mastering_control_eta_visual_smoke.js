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
const css = read('assets/css/bulk-import-hud.css');
const lifecycle = read('src/state/track-lifecycle-service.js');
const orchestrator = read('src/audio/mastering-orchestrator-service.js');
const browserSpec = read('qa/browser/v1573-bulk-mastering-controls-visual.spec.js');

assert.strictEqual(pkg.version, '1.5.96', 'package version should be v1.5.96');
assert(pkg.qaChecks.includes('node qa/v1573_bulk_mastering_control_eta_visual_smoke.js'), 'release QA should include v1.5.96 smoke');

for (const id of ['bulkImportHudCancel', 'bulkImportHudRetryFailed', 'bulkImportHudFilter']) {
  assert(index.includes(`id="${id}"`), `bulk mastering control missing: ${id}`);
}
assert(hud.includes("const VIEW_VERSION = '1.5.96-bulk-control-eta-result-filter'"), 'HUD version contract missing');
assert(hud.includes('markMasteringTrackStart') && hud.includes('markMasteringTrackResult') && hud.includes('markMasteringBatchCancelled'), 'HUD batch lifecycle hooks missing');
assert(hud.includes('getAverageMasteringDurationMs') && hud.includes('currentRemainingMs') && hud.includes('완료 예상 약'), 'per-track and batch ETA calculation missing');
assert(hud.includes('trackMatchesFilter') && hud.includes("['all', 'active', 'completed', 'failed', 'cancelled', 'pending']"), 'result filters missing');
assert(hud.includes('getFailedTracks') && app.includes('retryFailedBulkMasteringTracks'), 'failed-only retry bridge missing');
assert(app.includes('cancelActiveMasteringBatch') && app.includes('externalMasteringSignal') && app.includes("assertMasteringJobActive('start')"), 'batch cancellation signal is not linked to active mastering');
assert(lifecycle.includes('bulkMasteringDurationMs') && lifecycle.includes('bulkMasteringCancelReason'), 'track lifecycle batch fields missing');
assert(css.includes('.bulk-import-hud-cancel') && css.includes('.bulk-import-hud-retry') && css.includes('.bulk-import-row.is-cancelled'), 'batch control/result styles missing');
assert(browserSpec.includes('screenshot') && browserSpec.includes('boundingBox') && browserSpec.includes('375'), 'desktop/mobile visual layout browser contract missing');

(async () => {
  const sandbox = { window: null, console, AbortController, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  vm.runInNewContext(orchestrator, sandbox, { filename: 'mastering-orchestrator-service.js' });
  const starts = [];
  const results = [];
  const cancelledBatches = [];
  const busy = [];
  const runner = sandbox.window.FoxBearMasteringOrchestratorService.createMasteringBatchRunner({
    beginHudBatch: items => ({ batchId: `qa-${items.length}` }),
    setBusy: value => busy.push(Boolean(value)),
    onTrackStart: track => starts.push(track.id),
    onTrackComplete: (track, meta) => results.push([track.id, meta.outcome]),
    onBatchCancelled: meta => cancelledBatches.push(meta.remaining.map(track => track.id)),
    masterTrack: (track, calledFromBatch, options) => new Promise(resolve => {
      const timer = setTimeout(() => resolve(true), 200);
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve(false);
      }, { once: true });
    })
  });
  const promise = runner.runBatch([{ id: 'one' }, { id: 'two' }, { id: 'three' }]);
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.strictEqual(runner.cancelActiveBatch('qa-user-cancel'), true, 'active batch cancel should be accepted');
  const result = await promise;
  assert.strictEqual(result.stopped, true, 'cancelled batch should be marked stopped');
  assert.strictEqual(result.cancelled, 3, 'current and remaining tracks should be counted as cancelled');
  assert.deepStrictEqual(starts, ['one'], 'tracks after cancellation should not start');
  assert.deepStrictEqual(results, [['one', 'cancelled']], 'active track should settle as cancelled');
  assert.deepStrictEqual(cancelledBatches, [['two', 'three']], 'remaining tracks should be reported to the cancellation hook');
  assert.deepStrictEqual(busy, [true, false], 'busy state should always be released');
  assert.strictEqual(runner.getActiveBatchSnapshot(), null, 'active batch state should clear after cancellation');
  console.log('PASS v1.5.73 bulk mastering control/ETA/visual smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
