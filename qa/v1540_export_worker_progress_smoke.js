'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const workerServiceSource = read('src/utils/worker-job-service.js');
const dialogSource = read('src/ui/download-dialog-view.js');
const downloadSource = read('src/download/download-service.js');
const appSource = read('src/app.js');
const mp3Worker = read('src/workers/mp3-encoder.worker.js');
const wavWorker = read('src/workers/wav-encoder.worker.js');
const finalizerWorker = read('src/workers/master-finalizer.worker.js');
const css = read('assets/css/download-dialog.css');

assert(workerServiceSource.includes("data?.type === 'progress'"), 'worker progress messages are not isolated from final responses');
assert(workerServiceSource.includes('options.onProgress?.(progress)'), 'worker progress callback is not invoked');
assert(dialogSource.includes('download-options-worker-progress'), 'download progress panel is missing');
assert(dialogSource.includes("cancelAction.textContent = '변환 취소'"), 'download cancel action is missing');
assert(dialogSource.includes("currentActionController.abort('download-user-cancelled')"), 'download cancel action does not abort the worker job');
assert(dialogSource.includes("error.code === 'FOXBEAR_WORKER_JOB_TIMEOUT'"), 'timeout-specific download recovery message is missing');
assert(downloadSource.includes('signal: options.signal || null'), 'download re-encode does not receive the AbortSignal');
assert(downloadSource.includes('onProgress: typeof options.onProgress'), 'download re-encode does not receive progress callbacks');
assert(downloadSource.includes('throwIfDownloadAborted(options.signal)'), 'same-format Blob verification does not re-check cancellation');
assert(appSource.includes("onProgress: progress =>"), 'mastering finalizer/encoder progress is not connected to track UI');
assert(appSource.includes("error?.code === 'FOXBEAR_WORKER_JOB_TIMEOUT'"), 'encoder timeout is still hidden by a fallback');
assert(appSource.includes('Math.min(600000, Math.max(180000, Number(buffer.duration || 0) * 300))'), 'MP3 timeout is not adaptive to audio duration');
assert(appSource.includes('Math.min(600000, Math.max(45000, Number(buffer.duration || 0) * 120))'), 'WAV timeout is not adaptive to audio duration');
assert(appSource.includes("FOXBEAR_WAV_FALLBACK_TOO_LARGE"), 'large WAV main-thread fallback guard is missing');
assert(mp3Worker.includes("type: 'progress'"), 'MP3 worker progress messages are missing');
assert(wavWorker.includes("type: 'progress'"), 'WAV worker progress messages are missing');
assert(finalizerWorker.includes("type: 'progress'"), 'finalizer worker progress messages are missing');
assert(css.includes('.download-options-worker-progress-track'), 'download progress CSS is missing');


function runWorkerRuntime(source, payload, options = {}) {
  const messages = [];
  const context = {
    self: null,
    console,
    Math,
    Date,
    Error,
    Object,
    Number,
    String,
    Array,
    Promise,
    URL,
    ArrayBuffer,
    DataView,
    Float32Array,
    Int16Array,
    Uint8Array,
    setTimeout,
    clearTimeout
  };
  context.self = {
    location: { href: options.href || 'https://example.test/src/workers/test.worker.js', origin: 'https://example.test' },
    postMessage(message) { messages.push(message); },
    trustedTypes: null
  };
  context.importScripts = () => {
    context.self.lamejs = {
      Mp3Encoder: class {
        encodeBuffer() { return new Uint8Array([1, 2, 3]); }
        flush() { return new Uint8Array([4, 5]); }
      }
    };
  };
  vm.runInNewContext(source, context, { filename: options.filename || 'worker.js' });
  const result = context.self.onmessage({ data: payload });
  return Promise.resolve(result).then(() => messages);
}

(async () => {
  const context = { window: null, setTimeout, clearTimeout, Date, Math, Error, Object, Number, String, Promise, console };
  context.window = context;
  vm.runInNewContext(workerServiceSource, context, { filename: 'worker-job-service.js' });
  const progressEvents = [];
  class ProgressWorker {
    postMessage(payload) {
      setTimeout(() => this.onmessage?.({ data: { type: 'progress', __foxbearProgress: true, __foxbearJobId: payload.__foxbearJobId, percent: 31, stage: '인코딩', detail: '첫 구간' } }), 0);
      setTimeout(() => this.onmessage?.({ data: { ok: true, __foxbearJobId: payload.__foxbearJobId, value: 7 } }), 5);
    }
    terminate() { this.terminated = true; }
  }
  const result = await context.FoxBearWorkerJobService.run({
    createWorker: () => new ProgressWorker(),
    payload: {},
    jobId: 'progress-job',
    timeoutMs: 1000,
    onProgress: event => progressEvents.push(event)
  });
  assert.strictEqual(result.data.value, 7, 'progress message incorrectly settled the worker job');
  assert.strictEqual(progressEvents.length, 1, 'worker progress callback count mismatch');
  assert.strictEqual(progressEvents[0].percent, 31, 'worker progress percent mismatch');
  assert.strictEqual(progressEvents[0].stage, '인코딩', 'worker progress stage mismatch');

  const controller = new AbortController();
  let abortWorker;
  class AbortWorker {
    postMessage(payload) {
      setTimeout(() => this.onmessage?.({ data: { type: 'progress', __foxbearProgress: true, __foxbearJobId: payload.__foxbearJobId, percent: 10 } }), 0);
    }
    terminate() { this.terminated = true; }
  }
  const abortPromise = context.FoxBearWorkerJobService.run({
    createWorker: () => (abortWorker = new AbortWorker()),
    payload: {},
    jobId: 'abort-job',
    timeoutMs: 1000,
    signal: controller.signal
  });
  controller.abort('qa-cancel');
  await assert.rejects(abortPromise, error => error?.name === 'AbortError' && error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED');
  assert.strictEqual(abortWorker.terminated, true, 'aborted worker was not terminated');

  const samples = new Float32Array(8192);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.sin(index / 17) * 0.2;
  const wavMessages = await runWorkerRuntime(wavWorker, { __foxbearJobId: 'wav-runtime', sampleRate: 44100, channels: 1, length: samples.length, format: 'wav16', channelBuffers: [samples.slice().buffer] }, { filename: 'wav-encoder.worker.js' });
  assert(wavMessages.some(message => message.type === 'progress'), 'WAV worker did not emit runtime progress');
  assert(wavMessages.some(message => message.ok === true && message.arrayBuffer), 'WAV worker did not emit a terminal file');

  const mp3Messages = await runWorkerRuntime(mp3Worker, { __foxbearJobId: 'mp3-runtime', sampleRate: 44100, channels: 1, length: samples.length, bitrate: 128000, channelBuffers: [samples.slice().buffer] }, { filename: 'mp3-encoder.worker.js', href: 'https://example.test/src/workers/mp3-encoder.worker.js' });
  assert(mp3Messages.some(message => message.type === 'progress'), 'MP3 worker did not emit runtime progress');
  assert(mp3Messages.some(message => message.ok === true && message.arrayBuffer), 'MP3 worker did not emit a terminal file');

  const finalizerMessages = await runWorkerRuntime(finalizerWorker, { __foxbearJobId: 'finalizer-runtime', sampleRate: 44100, channels: 1, length: samples.length, targetLufs: -14, ceilingDb: -1, qualityMode: 'fast', truePeak: false, analysis: {}, channelBuffers: [samples.slice().buffer] }, { filename: 'master-finalizer.worker.js' });
  assert(finalizerMessages.filter(message => message.type === 'progress').length >= 5, 'finalizer worker phase progress is incomplete');
  assert(finalizerMessages.some(message => message.ok === true && Array.isArray(message.channelBuffers)), 'finalizer worker did not emit terminal audio');

  const downloadContext = { window: null, globalThis: null, console, Blob, File: class TestFile extends Blob {}, WeakMap, Map, Set, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, navigator: { userAgent: 'Chrome' }, location: { href: 'https://example.test/' }, document: { body: { appendChild() {} }, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, remove() {}, click() {} }), getElementById: () => null, visibilityState: 'visible' }, setTimeout, clearTimeout, requestAnimationFrame: callback => callback(), open: () => ({}), isSecureContext: true };
  downloadContext.window = downloadContext;
  downloadContext.globalThis = downloadContext;
  vm.runInNewContext(downloadSource, downloadContext, { filename: 'download-service.js' });
  const wavBytes = new Uint8Array(128); wavBytes.set([82, 73, 70, 70], 0); wavBytes.set([87, 65, 86, 69], 8);
  const delayedBlob = { size: wavBytes.length, type: 'audio/wav', slice: () => ({ arrayBuffer: () => new Promise(resolve => setTimeout(() => resolve(wavBytes.buffer.slice(0)), 15)) }) };
  const downloadAbort = new AbortController();
  const preparePromise = downloadContext.FoxBearDownloadService.prepareTrackDownloadBlob({ outBlob: delayedBlob, outFormat: 'wav24', outName: 'cancel.wav' }, 'wav24', {}, { signal: downloadAbort.signal });
  setTimeout(() => downloadAbort.abort('same-format-cancel'), 1);
  await assert.rejects(preparePromise, error => error?.name === 'AbortError' && error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED');

  console.log('PASS v1.5.40 export worker progress, cancel, timeout, and stale-result UI smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
