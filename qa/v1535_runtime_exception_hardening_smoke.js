'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const spectrumPath = path.join(root, 'src/ui/spectrum-visualizer.js');
const decode = read('src/audio/audio-decode-service.js');
const orchestrator = read('src/audio/mastering-orchestrator-service.js');
const app = read('src/app.js');
const appState = read('src/state/app-state.js');
const download = read('src/download/download-service.js');
const cache = read('src/audio/analysis-cache-service.js');
const importQueue = read('src/audio/import-queue-service.js');
const mp3Worker = read('src/workers/mp3-encoder.worker.js');
const wavWorker = read('src/workers/wav-encoder.worker.js');
const finalizerWorker = read('src/workers/master-finalizer.worker.js');

assert(!fs.existsSync(spectrumPath), 'retired spectrum visualizer must remain deleted');
assert(!app.includes('FoxBearSpectrumVisualizer'), 'app must not retain retired visualizer exception paths');

for (const key of [
  'bottomPreviewLayoutObserverInstalled',
  'bottomPreviewLayoutRaf',
  'bottomPreviewResizeObserver',
  'dockController',
  'dockRemoteDelegationInstalled',
  'featureDialogClosingUntil',
  'featureTooltipTimer',
  'managedModalControllerInstalled',
  'mobileNative',
  'modalController',
  'selectPopupKeyBound'
]) {
  assert(appState.includes(`${key}:`), `runtime state default missing: ${key}`);
}

assert(download.includes('await writable?.abort?.()'), 'partial File System Access writes are not aborted on failure');
assert(download.includes("recordDownloadEvent('file-picker-failed'"), 'file picker failure telemetry is missing');
assert(cache.includes('req.onblocked'), 'IndexedDB blocked-open handling is missing');
assert((cache.match(/tx\.onabort = tx\.onerror/g) || []).length >= 3, 'IndexedDB transaction abort handling is incomplete');
assert(importQueue.includes('normalizeInteger(options.concurrency'), 'analysis queue concurrency is not finite-normalized');
assert(importQueue.includes('queuedIds.add(id)'), 'analysis queue does not normalize track IDs before registration');
assert(importQueue.includes('queuedIds.delete(id)'), 'analysis queue does not normalize track IDs before removal');

const outputCommit = app.slice(app.indexOf('const dockAudioBeforeComplete'), app.indexOf("track.status = 'done'"));
const profileAt = outputCommit.indexOf('finishPerformanceProfile');
const nameAt = outputCommit.indexOf('buildMasteredFileName');
const createAt = outputCommit.indexOf('URL.createObjectURL');
const assignAt = outputCommit.indexOf('track.masteredUrl = nextMasteredUrl');
const revokeAt = outputCommit.indexOf('URL.revokeObjectURL(previousMasteredUrl)');
assert(profileAt >= 0 && profileAt < createAt, 'master URL is created before performance metadata succeeds');
assert(nameAt >= 0 && nameAt < createAt, 'master URL is created before output name succeeds');
assert(createAt >= 0 && createAt < assignAt && assignAt < revokeAt, 'master URL swap is not atomic');

function loadDecodeService() {
  const fakeAudio = {
    preload: '',
    muted: false,
    addEventListener() {},
    removeAttribute() {},
    load() {},
    set src(value) { this._src = value; },
    get src() { return this._src || ''; }
  };
  const sandbox = {
    window: null,
    performance: { now: () => 1 },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    document: { createElement: () => fakeAudio },
    setTimeout: () => 1,
    clearTimeout() {},
    console
  };
  sandbox.window = sandbox;
  vm.runInNewContext(decode, sandbox, { filename: 'audio-decode-service.js' });
  return sandbox.window.FoxBearAudioDecodeService;
}

(async () => {
  const decodeService = loadDecodeService();
  const eagerAbortSignal = {
    aborted: false,
    addEventListener(type, handler) { if (type === 'abort') handler(); },
    removeEventListener() {}
  };
  const mediaResult = await decodeService.verifyMediaElementCanLoad({ name: 'test.wav' }, 500, eagerAbortSignal);
  assert.strictEqual(mediaResult.aborted, true, 'metadata probe abort race did not settle as cancelled');

  const orchestratorSandbox = { window: null, console };
  orchestratorSandbox.window = orchestratorSandbox;
  vm.runInNewContext(orchestrator, orchestratorSandbox, { filename: 'mastering-orchestrator-service.js' });
  const busyStates = [];
  let finalRenderCount = 0;
  const runner = orchestratorSandbox.window.FoxBearMasteringOrchestratorService.createMasteringBatchRunner({
    setBusy: value => busyStates.push(Boolean(value)),
    render: options => { if (options && options.final) finalRenderCount += 1; },
    prepareTrack: track => { if (track.id === 'bad') throw new Error('track prepare failed'); },
    masterTrack: async track => track.id === 'ok',
    onTrackError() {}
  });
  const batchResult = await runner.runBatch([{ id: 'bad' }, { id: 'ok' }], {
    initialRenderOptions: { initial: true },
    finalRenderOptions: { final: true }
  });
  assert.deepStrictEqual({ completed: batchResult.completed, failed: batchResult.failed }, { completed: 1, failed: 1 }, 'one track exception should not abort the remaining batch');
  assert.deepStrictEqual(busyStates, [true, false], 'batch busy state is not released');
  assert.strictEqual(finalRenderCount, 1, 'batch final render did not execute exactly once');

  const setupBusy = [];
  const setupRunner = orchestratorSandbox.window.FoxBearMasteringOrchestratorService.createMasteringBatchRunner({
    setBusy: value => setupBusy.push(Boolean(value)),
    beforeBatch: () => { throw new Error('setup failed'); },
    masterTrack: async () => true
  });
  await assert.rejects(() => setupRunner.runBatch([{ id: 'one' }]), /setup failed/);
  assert.deepStrictEqual(setupBusy, [true, false], 'setup exception leaves the batch busy flag stuck');

  const queueSandbox = {
    window: null,
    console,
    setTimeout(handler) { this.scheduled = handler; return 1; },
    clearTimeout() {},
    AbortController
  };
  queueSandbox.window = queueSandbox;
  vm.runInNewContext(importQueue, queueSandbox, { filename: 'import-queue-service.js' });
  const queue = queueSandbox.window.FoxBearImportQueueService.createTrackAnalysisQueue({ concurrency: 'not-a-number', yieldMs: Number.NaN });
  const numericTrack = { id: 42, name: 'numeric id' };
  assert.strictEqual(queue.queueTrack(numericTrack), true, 'numeric track ID was not queued');
  assert.strictEqual(queue.cancelTrack(42).pending, 0, 'numeric track ID was not cancelled after string normalization');
  assert.strictEqual(queue.getSnapshot().concurrency, 1, 'invalid concurrency did not fall back to one worker');

  function runWorker(source, payload) {
    const messages = [];
    const worker = {
      location: { href: 'https://example.com/src/workers/test.worker.js', origin: 'https://example.com' },
      postMessage(message) { messages.push(message); },
      trustedTypes: null
    };
    const sandbox = { self: worker, URL, console, Float32Array, Uint8Array, ArrayBuffer, DataView, Math, Number, Set, Promise };
    vm.runInNewContext(source, sandbox, { filename: 'worker.js' });
    return Promise.resolve(worker.onmessage({ data: payload })).then(() => messages.at(-1));
  }

  const badMp3 = await runWorker(mp3Worker, { sampleRate: Infinity, channels: 2, length: 1, bitrate: 320000, channelBuffers: [new Float32Array(1).buffer, new Float32Array(1).buffer] });
  assert.strictEqual(badMp3.ok, false, 'MP3 worker accepts a non-finite sample rate');
  const badWav = await runWorker(wavWorker, { sampleRate: 44100, channels: -1, length: 1, channelBuffers: [], format: 'wav24' });
  assert.strictEqual(badWav.ok, false, 'WAV worker accepts a negative channel count');
  const badFinalizer = await runWorker(finalizerWorker, { sampleRate: 44100, channels: 1, length: 1, targetLufs: Number.NaN, channelBuffers: [new Float32Array(1).buffer] });
  assert.strictEqual(badFinalizer.ok, false, 'finalizer worker accepts NaN mastering controls');

  assert(mp3Worker.includes('normalizeEncodePayload'), 'MP3 worker payload normalizer missing');
  assert(wavWorker.includes('0xffffffff - 44'), 'WAV RIFF size guard missing');
  assert(finalizerWorker.includes('normalizeFiniteNumber'), 'finalizer finite-number guard missing');

  console.log('PASS v1.5.35 runtime exception hardening smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
