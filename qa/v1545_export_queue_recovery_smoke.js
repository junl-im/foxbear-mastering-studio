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
  const documentListeners = new Map();
  const activity = [];
  const progress = [];
  const document = {
    hidden: false,
    addEventListener(name, fn) { documentListeners.set(name, fn); }
  };
  const progressView = {
    beginQueue(meta) { progress.push(['begin', meta.total]); },
    updateQueue(meta) { progress.push(['update', meta.phase, meta.paused, meta.current?.errorCode || '']); },
    completeQueue(meta) { progress.push(['complete', meta.counts?.done || 0]); },
    failQueue(message) { progress.push(['fail', message]); },
    cancelQueue(message) { progress.push(['cancel', message]); },
    show() {}
  };
  const window = {
    Blob,
    AbortController,
    document,
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome',
      storage: { async estimate() { return { quota: 1024 * 1024 * 1024, usage: 64 * 1024 * 1024 }; } }
    },
    FoxBearExportProgressView: progressView,
    FoxBearServiceWorkerUpdateService: { publishActivity(value) { activity.push(Boolean(value)); } },
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
    dispatchEvent() { return true; }
  };
  const context = vm.createContext({
    window,
    Blob,
    AbortController,
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    console,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    Error,
    Promise,
    Set,
    Map,
    RegExp
  });
  vm.runInContext(read('src/download/export-queue-service.js'), context, { filename: 'export-queue-service.js' });
  const service = window.FoxBearExportQueueService;
  assert(service && typeof service.pause === 'function' && typeof service.resume === 'function', 'pause/resume API missing');
  assert(typeof service.classifyDeliveryError === 'function', 'delivery error classifier missing');

  const files = [
    { id: 'a', fileName: 'A.wav', blob: new Blob([new Uint8Array(2 * 1024 * 1024)], { type: 'audio/wav' }) },
    { id: 'b', fileName: 'B.wav', blob: new Blob([new Uint8Array(1024 * 1024)], { type: 'audio/wav' }) }
  ];
  let secondFails = true;
  const started = await service.start({
    files,
    environment: { restricted: false, mobile: false },
    progressView,
    supportsPicker: true,
    validateFile: async blob => assert(blob.size > 0),
    saveWithPicker: async (blob, name) => {
      if (name === 'B.wav' && secondFails) {
        secondFails = false;
        const error = new Error('not enough space');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return { mode: 'picker', size: blob.size };
    },
    showToast() {}
  });
  assert.strictEqual(started.ok, true, 'queue start failed');
  assert(service.getSnapshot().estimatedCurrentMs > 0, 'picker ETA was not estimated');

  const paused = service.pause('user-paused');
  assert.strictEqual(paused.paused, true, 'queue did not pause');
  assert.strictEqual(service.getSnapshot().pauseReason, 'user-paused', 'pause reason missing');
  const blocked = await service.deliverCurrent();
  assert.strictEqual(blocked.paused, true, 'paused queue allowed delivery');
  const resumed = service.resume('user-resumed');
  assert.strictEqual(resumed.resumed, true, 'queue did not resume');

  const first = await service.deliverCurrent();
  assert.strictEqual(first.ok, true, 'first file delivery failed');
  assert(service.getSnapshot().estimatedRemainingMs > 0, 'remaining picker ETA missing');

  const failed = await service.deliverCurrent();
  assert.strictEqual(failed.ok, false, 'quota failure was not returned');
  assert.strictEqual(failed.diagnosis.code, 'storage-full', 'quota failure was not classified');
  assert.strictEqual(service.getSnapshot().current.errorCode, 'storage-full', 'classified error was not retained on current item');
  assert(service.getSnapshot().current.errorHint.includes('저장 공간'), 'storage recovery hint missing');
  const retry = await service.deliverCurrent();
  assert.strictEqual(retry.complete, true, 'failed file could not be retried');
  assert.strictEqual(activity.at(-1), false, 'service-worker activity was not released after queue completion');

  await service.start({
    files: [files[0]],
    environment: { restricted: false },
    progressView,
    supportsPicker: false,
    validateFile: async () => true,
    downloadFile: async () => ({ mode: 'download' }),
    showToast() {}
  });
  document.hidden = true;
  documentListeners.get('visibilitychange')();
  assert.strictEqual(service.getSnapshot().paused, true, 'background transition did not pause queue');
  assert.strictEqual(service.getSnapshot().pauseReason, 'background', 'background pause reason missing');
  document.hidden = false;
  documentListeners.get('visibilitychange')();
  assert.strictEqual(service.getSnapshot().paused, false, 'foreground return did not restore queue');
  assert(service.getSnapshot().message.includes('복귀'), 'foreground recovery message missing');
  service.cancel('qa-end');
  assert.strictEqual(activity.at(-1), false, 'service-worker activity was not released after cancellation');
  assert(progress.some(call => call[0] === 'update' && call[1] === 'paused'), 'paused phase was not rendered');
}

function sourceCheck() {
  const index = read('index.html');
  const service = read('src/download/export-queue-service.js');
  const view = read('src/download/export-progress-view.js');
  const css = read('assets/css/export.css');
  const pkg = JSON.parse(read('package.json'));

  assert(index.includes('id="exportProgressPause"'), 'pause/resume UI button missing');
  assert(service.includes('classifyDeliveryError') && service.includes("code: 'storage-full'"), 'delivery failure classification missing');
  assert(service.includes('estimatedRemainingMs') && service.includes('throughputBytesPerMs'), 'queue ETA model missing');
  assert(service.includes("publishActivity?.(Boolean(snapshot.active"), 'service-worker activity release is not state-derived');
  assert(view.includes('foxbear:export-queue-pause-toggle') && view.includes('formatDuration'), 'progress view pause/ETA wiring missing');
  assert(css.includes('.export-progress-panel.is-queue.is-paused'), 'paused queue styling missing');
  assert(pkg.qaChecks.includes('node qa/v1545_export_queue_recovery_smoke.js'), 'v1.6.99 regression test is not registered');
}

(async () => {
  sourceCheck();
  await runtimeCheck();
  console.log('PASS v1.5.45 export queue recovery smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
