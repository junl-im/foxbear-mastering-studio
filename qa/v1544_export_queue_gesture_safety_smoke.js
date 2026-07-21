#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

async function runtimeCheck() {
  const listeners = new Map();
  const progressCalls = [];
  const progressView = {
    beginQueue(meta) { progressCalls.push(['begin', meta]); },
    updateQueue(meta) { progressCalls.push(['update', meta.phase, meta.current?.fileName || '']); },
    completeQueue(meta) { progressCalls.push(['complete', meta.counts?.done || 0]); },
    failQueue(message) { progressCalls.push(['fail', message]); },
    cancelQueue(message) { progressCalls.push(['cancel', message]); },
    show() {}
  };
  const window = {
    Blob,
    AbortController,
    navigator: {
      storage: { async estimate() { return { quota: 512 * 1024 * 1024, usage: 32 * 1024 * 1024 }; } }
    },
    FoxBearExportProgressView: progressView,
    FoxBearServiceWorkerUpdateService: { publishActivity() {} },
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
    dispatchEvent() { return true; }
  };
  const context = vm.createContext({ window, Blob, AbortController, CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, console, Date, Object, Array, String, Number, Boolean, Math, Error, Promise, Set, Map });
  vm.runInContext(read('src/download/export-queue-service.js'), context, { filename: 'export-queue-service.js' });
  const service = window.FoxBearExportQueueService;
  assert(service && typeof service.start === 'function', 'queue service did not attach');

  const delivered = [];
  const files = [
    { id: 'a', fileName: 'A.wav', blob: new Blob([new Uint8Array(64)], { type: 'audio/wav' }) },
    { id: 'b', fileName: 'B.wav', blob: new Blob([new Uint8Array(96)], { type: 'audio/wav' }) }
  ];
  const start = await service.start({
    files,
    environment: { restricted: false },
    progressView,
    supportsPicker: true,
    validateFile: async blob => assert(blob.size > 44),
    saveWithPicker: async (blob, name) => { delivered.push(name); return { mode: 'picker', size: blob.size }; },
    downloadFile: async () => { throw new Error('download fallback should not run'); },
    showToast() {}
  });
  assert.strictEqual(start.ok, true, 'queue did not start');
  assert.strictEqual(service.getSnapshot().mode, 'picker', 'queue did not select picker mode');
  assert.strictEqual(service.getSnapshot().current.fileName, 'A.wav', 'first file is not ready');

  const first = await service.deliverCurrent();
  assert.strictEqual(first.ok, true, 'first file delivery failed');
  assert.strictEqual(service.getSnapshot().current.fileName, 'B.wav', 'queue did not advance one item');
  const second = await service.deliverCurrent();
  assert.strictEqual(second.complete, true, 'queue did not complete');
  assert.deepStrictEqual(delivered, ['A.wav', 'B.wav'], 'files were not delivered in order');
  assert(progressCalls.some(call => call[0] === 'complete' && call[1] === 2), 'completion view was not updated');

  let dismissOnce = true;
  await service.start({
    files: [files[0]],
    environment: { restricted: false },
    progressView,
    supportsPicker: true,
    validateFile: async () => true,
    saveWithPicker: async () => {
      if (dismissOnce) { dismissOnce = false; const error = new Error('dismissed'); error.name = 'AbortError'; throw error; }
      return { mode: 'picker' };
    },
    showToast() {}
  });
  const dismissed = await service.deliverCurrent();
  assert.strictEqual(dismissed.dismissed, true, 'picker dismissal should keep current item retryable');
  assert.strictEqual(service.getSnapshot().current.status, 'ready', 'dismissed item was not restored to ready');
  const retry = await service.deliverCurrent();
  assert.strictEqual(retry.complete, true, 'dismissed item could not be retried');

  await service.start({
    files: [files[0], files[1]],
    environment: { restricted: false },
    progressView,
    supportsPicker: false,
    validateFile: async () => true,
    downloadFile: async () => ({ mode: 'download' }),
    showToast() {}
  });
  const skipped = service.skipCurrent();
  assert.strictEqual(skipped.skipped, true, 'current item could not be skipped');
  assert.strictEqual(service.getSnapshot().current.fileName, 'B.wav', 'skip did not advance');
  const cancelled = service.cancel('qa-cancel');
  assert.strictEqual(cancelled.cancelled, true, 'queue cancel failed');
  assert.strictEqual(service.getSnapshot().active, false, 'queue remained active after cancel');
}

function sourceCheck() {
  const index = read('index.html');
  const app = read('src/app.js');
  const health = read('src/boot/runtime-health.js');
  const sw = read('sw.js');
  const update = read('src/boot/service-worker-update-service.js');
  const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
  const pkg = JSON.parse(read('package.json'));

  assert.strictEqual((index.match(/src\/download\/export-queue-service\.js/g) || []).length, 1, 'queue service must load exactly once');
  ['individualExportBtn', 'exportProgressNext', 'exportProgressSkip'].forEach(id => assert(index.includes(`id="${id}"`), `missing queue UI: ${id}`));
  assert(app.includes('startSequentialExport') && app.includes('isAnyExportActive'), 'app does not orchestrate the export queue');
  assert(app.includes('syncExportInteractionLock') && app.includes("setAttribute('inert', '')"), 'mastering controls are not frozen while an export owns the output snapshot');
  assert(health.includes("'FoxBearExportQueueService.start'"), 'runtime health does not require queue service');
  assert(sw.includes('./src/download/export-queue-service.js?v='), 'service worker does not precache queue service');
  assert(update.includes('exportQueue.active') && update.includes('exportQueue.preparing'), 'service worker update guard ignores export queue');
  assert(handoff.requiredRuntimeAssets.includes('src/download/export-queue-service.js'), 'handoff manifest omits queue service');
  assert(pkg.qaChecks.includes('node --check src/download/export-queue-service.js'), 'queue syntax check is not registered');
  assert(pkg.qaChecks.includes('node qa/v1544_export_queue_gesture_safety_smoke.js'), 'queue regression test is not registered');
}

(async () => {
  sourceCheck();
  await runtimeCheck();
  console.log('PASS v1.5.44 export queue gesture safety smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
