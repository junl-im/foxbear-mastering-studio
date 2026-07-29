'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('src/app.js');
const config = read('src/config/app-runtime-config.js');
const workerServiceSource = read('src/utils/worker-job-service.js');
const preflightSource = read('src/audio/import-preflight-service.js');
const updateServiceSource = read('src/boot/service-worker-update-service.js');

assert(app.includes('preflightImportPlanDecodedMemory'), 'decoded-memory preflight is not connected to import');
assert(preflightSource.includes('probeAudioFileMemory'), 'audio metadata memory probe is not used');
assert(app.includes('LOW_MEMORY_MAX_DECODED_PCM_BYTES') && app.includes('STANDARD_MAX_DECODE_PEAK_BYTES'), 'decoded-memory limits are not enforced');
assert(app.includes('masteringAbortController') && app.includes('assertMasteringJobActive'), 'mastering worker jobs are not cancellable/stale guarded');
assert(app.includes("jobId: `${masteringJobId}:finalizer`") && app.includes("jobId: `${masteringJobId}:encode`"), 'mastering worker job ids are missing');
assert(config.includes('LOW_MEMORY_MAX_DECODED_PCM_BYTES: 192 * 1024 * 1024'), 'low-memory decoded PCM budget mismatch');
assert(config.includes('LOW_MEMORY_MAX_DECODE_PEAK_BYTES: 448 * 1024 * 1024'), 'low-memory peak budget mismatch');

function makeWavHeader({ sampleRate = 48000, channels = 2, seconds = 600, bits = 16 } = {}) {
  const bytesPerSample = bits / 8;
  const dataSize = sampleRate * channels * bytesPerSample * seconds;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const write = (offset, text) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, bits, true);
  write(36, 'data'); view.setUint32(40, dataSize, true);
  return buffer;
}

(async () => {
  const decodeContext = {
    window: null,
    navigator: {},
    performance: { now: () => 0 },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    document: { createElement() { throw new Error('media metadata fallback should not run for WAV'); } },
    setTimeout, clearTimeout, console, Blob, DataView, ArrayBuffer, Float32Array, Math, Date, Error, Object, Number, String, Promise
  };
  decodeContext.window = decodeContext;
  vm.runInNewContext(read('src/audio/audio-decode-service.js'), decodeContext, { filename: 'audio-decode-service.js' });
  const header = makeWavHeader();
  const file = new Blob([header], { type: 'audio/wav' });
  Object.defineProperty(file, 'name', { value: 'ten-minutes.wav' });
  const probe = await decodeContext.FoxBearAudioDecodeService.probeAudioFileMemory(file);
  assert.strictEqual(probe.known, true, 'WAV header memory probe should be known');
  assert.strictEqual(Math.round(probe.durationSec), 600, 'WAV duration estimate mismatch');
  assert(probe.decodedPcmBytes > 192 * 1024 * 1024, '10-minute stereo WAV should exceed mobile PCM budget');
  assert(probe.estimatedPeakBytes > 448 * 1024 * 1024, '10-minute stereo WAV should exceed mobile peak budget');

  const workerContext = { window: null, setTimeout, clearTimeout, Date, Math, Error, Object, Number, String, Promise, console };
  workerContext.window = workerContext;
  vm.runInNewContext(workerServiceSource, workerContext, { filename: 'worker-job-service.js' });
  class FakeWorker {
    postMessage(payload) {
      setTimeout(() => this.onmessage?.({ data: { ok: true, __foxbearJobId: 'wrong', value: 1 } }), 0);
      setTimeout(() => this.onmessage?.({ data: { ok: true, __foxbearJobId: payload.__foxbearJobId, value: 2 } }), 5);
    }
    terminate() { this.terminated = true; }
  }
  const result = await workerContext.FoxBearWorkerJobService.run({ createWorker: () => new FakeWorker(), payload: {}, timeoutMs: 1000, jobId: 'expected' });
  assert.strictEqual(result.data.value, 2, 'stale worker response was not ignored');

  const storage = new Map();
  storage.set('foxbear-sw-activity:peer', JSON.stringify({
    type: 'FOXBEAR_TAB_ACTIVITY', tabId: 'peer', updatedAt: Date.now(), visibility: 'visible',
    activity: { idle: false, reasons: ['mastering'], mastering: 1 }
  }));
  const posted = [];
  const updateTimers = [];
  const updateContext = {
    window: null,
    navigator: { serviceWorker: { controller: {}, addEventListener() {} } },
    document: { visibilityState: 'visible', querySelectorAll: () => [], addEventListener() {} },
    localStorage: {
      get length() { return storage.size; },
      key(index) { return Array.from(storage.keys())[index] || null; },
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    setTimeout(callback, delay) { updateTimers.push({ callback, delay }); return updateTimers.length; }, clearTimeout() {}, setInterval: () => 1,
    addEventListener() {}, Date, Math, JSON, Object, Number, String, Array, console
  };
  updateContext.window = updateContext;
  vm.runInNewContext(updateServiceSource, updateContext, { filename: 'service-worker-update-service.js' });
  const waiting = { postMessage(message) { posted.push(message); } };
  updateContext.FoxBearServiceWorkerUpdateService.coordinate({ waiting, addEventListener() {}, installing: null });
  assert.strictEqual(updateContext.FoxBearServiceWorkerUpdateService.requestActivation('test'), false, 'SW activation should be blocked while a peer tab is busy');
  assert.strictEqual(posted.length, 0, 'waiting worker received activation despite busy peer');
  storage.set('foxbear-sw-activity:peer', JSON.stringify({ type: 'FOXBEAR_TAB_ACTIVITY', tabId: 'peer', updatedAt: Date.now(), closed: true }));
  assert.strictEqual(updateContext.FoxBearServiceWorkerUpdateService.requestActivation('test'), true, 'SW activation should proceed after peers become idle');
  const activationClaim = updateTimers.find(timer => timer.delay === 80);
  assert(activationClaim, 'waiting worker activation claim timer missing');
  activationClaim.callback();
  assert.strictEqual(posted[0]?.type, 'SKIP_WAITING', 'waiting worker activation message missing after claim settlement');

  console.log('v1.5.38 preflight, worker job, and multi-tab update smoke passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
