#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const guardSource = read('src/download/export-guard-service.js');
const zipSource = read('src/download/zip-export-service.js');
const appSource = read('src/app.js');
const hudSource = read('src/ui/bulk-import-hud-view.js');
const hudCss = read('assets/css/bulk-import-hud.css');

assert(pkg.qaChecks.includes('node qa/v1660_bulk_zip_hud_navigation_smoke.js'), 'v1.6.85 QA entry missing');
assert(guardSource.includes('automaticIndividualFallback: false'), 'ZIP guard must disable automatic individual fallback');
assert(guardSource.includes("strategy: blockReason ? 'blocked-single-zip'"), 'ZIP guard must distinguish hard block from soft risk');
assert(zipSource.includes('fallbackStarted: false'), 'ZIP service must report that no fallback was started');
assert(zipSource.includes('FOXBEAR_ZIP_FILE_COUNT_MISMATCH'), 'ZIP service must validate archive file count');
assert(zipSource.includes('FOXBEAR_ZIP_SIZE_MISMATCH'), 'ZIP service must validate worker/blob size agreement');
assert(zipSource.includes('FOXBEAR_ZIP_DELIVERY_NAME_MISMATCH'), 'ZIP service must enforce .zip delivery');
assert(!zipSource.includes('startSequentialExport'), 'ZIP service must not call individual export flow');
assert(appSource.includes("'ZIP 다운로드 · 1개 파일'"), 'ZIP button must communicate one-file delivery');
assert(appSource.includes("'곡별 순차 저장 · 별도'"), 'individual export must remain a visibly separate action');
assert(read('index.html').includes('data-export-mode="zip"'), 'ZIP button must declare its export mode');
assert(read('index.html').includes('data-export-mode="individual"'), 'individual button must declare its export mode');

const guardContext = {
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  Set,
  Map,
  Promise,
  Error,
  Uint8Array,
  Blob,
  navigator: { userAgent: 'Android Mobile', deviceMemory: 2 },
  performance: {},
  matchMedia: () => ({ matches: true })
};
guardContext.window = guardContext;
guardContext.globalThis = guardContext;
vm.createContext(guardContext);
vm.runInContext(guardSource, guardContext, { filename: 'export-guard-service.js' });
const guard = guardContext.FoxBearExportGuardService;
const MB = 1024 * 1024;
const largeMobileTracks = Array.from({ length: 20 }, (_, index) => ({
  id: `track-${index + 1}`,
  status: 'done',
  name: `track-${index + 1}.wav`,
  outName: `track-${index + 1}.wav`,
  outBlob: { size: 45 * MB }
}));
const riskPlan = guard.prepareZipExportPlan(largeMobileTracks, {
  mobile: true,
  deviceMemoryGb: 2,
  memorySnapshot: { pressure: 'high', masteredBufferBytes: 0, previewBlobBytes: 0, policy: { lowMemory: true } }
});
assert.strictEqual(riskPlan.canCreateZip, true, 'soft memory risk must not replace ZIP with individual downloads');
assert.strictEqual(riskPlan.requiresIndividualDownload, false, 'individual fallback requirement must remain false');
assert.strictEqual(riskPlan.automaticIndividualFallback, false, 'automatic fallback flag must remain false');
assert.strictEqual(riskPlan.singleArchiveRequired, true, 'single archive intent must be preserved');
assert.strictEqual(riskPlan.softRisk, true, 'large mobile plan should expose a soft risk warning');

const tooManyTracks = Array.from({ length: 201 }, (_, index) => ({
  id: `over-${index + 1}`,
  status: 'done',
  name: `over-${index + 1}.wav`,
  outBlob: { size: MB }
}));
const hardPlan = guard.prepareZipExportPlan(tooManyTracks, { mobile: false, deviceMemoryGb: 8, memorySnapshot: {} });
assert.strictEqual(hardPlan.canCreateZip, false, 'worker file-count hard limit must block');
assert.strictEqual(hardPlan.strategy, 'blocked-single-zip', 'hard limit must remain a single-ZIP block');
assert.strictEqual(hardPlan.requiresIndividualDownload, false, 'hard block must not request individual downloads');

assert(hudSource.includes('function scheduleCurrentTrackNavigation'), 'HUD must schedule current-track navigation');
assert(hudSource.includes('function findCurrentTrackRow'), 'HUD must re-resolve rows after rerender');
assert(hudSource.includes('layoutReady') && hudSource.includes('attempt >= 5'), 'HUD must retry until layout is measurable');
assert(hudSource.includes("hudState.lastAutoScrolledTrackId = trackId") && hudSource.indexOf("hudState.lastAutoScrolledTrackId = trackId") > hudSource.indexOf('layoutReady'), 'HUD must only mark navigation after layout succeeds');
assert(hudSource.includes("if (!trackMatchesFilter(track, normalizeResultFilter(hudState.resultFilter))) hudState.resultFilter = 'all';"), 'new active track must return to a visible filter');
assert(hudSource.includes("현재 진행 중인 곡을 계속 표시하기 위해 전체 보기를 유지합니다."), 'HUD filter changes must not hide the active track');
assert(hudSource.includes('currentTrackNavigationPendingId === trackId'), 'HUD rerenders must preserve an already scheduled navigation');
assert(hudSource.includes("latestRow.classList?.add?.('is-auto-navigated')"), 'HUD must visually acknowledge navigation');
assert(hudCss.includes('.bulk-import-row.is-current.is-auto-navigated'), 'HUD navigation highlight style missing');
assert(hudCss.includes('scroll-margin-block: 34%'), 'HUD current row should settle near the list center');


async function exerciseZipService() {
  let queueStarts = 0;
  const zipContext = {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Promise,
    Error,
    Uint8Array,
    Blob,
    AbortController,
    Worker: function Worker() {},
    addEventListener() {},
    FoxBearExportQueueService: {
      getSnapshot: () => ({ active: false, preparing: false, delivering: false }),
      start: () => { queueStarts += 1; }
    },
    FoxBearServiceWorkerUpdateService: { publishActivity() {} }
  };
  zipContext.window = zipContext;
  zipContext.globalThis = zipContext;
  vm.createContext(zipContext);
  vm.runInContext(zipSource, zipContext, { filename: 'zip-export-service.js' });
  const service = zipContext.FoxBearZipExportService;
  const sourceBlob = new Blob(['mastered-audio']);
  const zipBlob = new Blob(['PK\u0003\u0004single-archive']);
  const completed = [{ id: 'done-1', name: 'done-1.wav', outName: 'done-1_mastered.wav', outBlob: sourceBlob }];
  const plan = {
    ok: true,
    canCreateZip: true,
    files: [{ fileName: 'done-1_mastered.wav', blob: sourceBlob }],
    completedCount: 1,
    outputBytes: sourceBlob.size,
    warnings: []
  };
  let downloads = 0;
  let downloadedName = '';
  const success = await service.start({
    completed,
    plan,
    workerUrl: 'zip-worker.js',
    runWorkerJob: async () => ({ ok: true, blob: zipBlob, fileCount: 1, size: zipBlob.size }),
    validateZipBlob: blob => ({ ok: blob === zipBlob, size: blob.size }),
    downloadBlob: async (blob, fileName) => {
      downloads += 1;
      downloadedName = fileName;
      assert.strictEqual(blob, zipBlob, 'ZIP delivery must receive the worker archive Blob');
      return { ok: true, fileName, mode: 'download' };
    },
    showToast() {},
    progressView: { begin() {}, setCancellable() {}, update() {}, complete() {}, fail() {}, cancel() {} }
  });
  assert.strictEqual(success.ok, true, 'single ZIP export must succeed');
  assert.strictEqual(success.fileCount, 1, 'single ZIP export must report the archive file count');
  assert.strictEqual(success.fallbackStarted, false, 'success must never start individual fallback');
  assert.strictEqual(downloads, 1, 'ZIP click must trigger exactly one browser download');
  assert(/\.zip$/i.test(downloadedName), 'ZIP delivery must retain a .zip filename');
  assert.strictEqual(queueStarts, 0, 'ZIP service must never start the individual queue');

  downloads = 0;
  const blocked = await service.start({
    completed,
    plan: { ...plan, canCreateZip: false, blockReason: 'hard limit' },
    runWorkerJob: async () => { throw new Error('worker must not start'); },
    downloadBlob: async () => { downloads += 1; },
    showToast() {},
    progressView: { begin() {}, fail() {} }
  });
  assert.strictEqual(blocked.hardLimit, true, 'hard-limit ZIP plan must fail closed');
  assert.strictEqual(blocked.fallbackStarted, false, 'hard-limit block must not start individual fallback');
  assert.strictEqual(downloads, 0, 'hard-limit block must not download files');
  assert.strictEqual(queueStarts, 0, 'hard-limit block must not start the individual queue');

  downloads = 0;
  const renamed = await service.start({
    completed,
    plan,
    workerUrl: 'zip-worker.js',
    runWorkerJob: async () => ({ ok: true, blob: zipBlob, fileCount: 1, size: zipBlob.size }),
    validateZipBlob: () => ({ ok: true, size: zipBlob.size }),
    downloadBlob: async () => {
      downloads += 1;
      return { ok: true, fileName: 'done-1_mastered.wav', mode: 'download' };
    },
    showToast() {},
    progressView: { begin() {}, setCancellable() {}, update() {}, complete() {}, fail() {}, cancel() {} }
  });
  assert.strictEqual(renamed.ok, false, 'non-ZIP delivery metadata must fail closed');
  assert.strictEqual(renamed.fallbackStarted, false, 'delivery mismatch must not start individual fallback');
  assert.strictEqual(downloads, 1, 'delivery mismatch test should perform only the intended ZIP delivery attempt');
  assert.strictEqual(queueStarts, 0, 'delivery mismatch must not start the individual queue');
}

exerciseZipService()
  .then(() => console.log('PASS v1.6.60 bulk ZIP single-archive and HUD navigation smoke'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
