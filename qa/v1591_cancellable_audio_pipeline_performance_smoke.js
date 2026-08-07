#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const appSource = fs.readFileSync('src/app.js', 'utf8');
const analysisWorkerSource = fs.readFileSync('src/workers/analysis.worker.js', 'utf8');
const pitchWorkerSource = fs.readFileSync('src/workers/pitch-wsola.worker.js', 'utf8');
const workerJobServiceSource = fs.readFileSync('src/utils/worker-job-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.74');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId));
assert(pkg.qaChecks.includes('node qa/v1591_cancellable_audio_pipeline_performance_smoke.js'));
assert(appSource.includes('currentSourceBuffer = await decodeAudio(track.file, masteringTask);'));
assert(appSource.includes('const analysis = await analyzeBufferAsync(currentSourceBuffer, masteringTask);'));
assert(appSource.includes("jobId: `${masteringJobId}:pitch`"));
assert(appSource.includes("jobId: `${previewJob.id}:pitch`"));
assert(appSource.includes("error.code ||= 'FOXBEAR_PITCH_FALLBACK_TOO_LARGE'"));
assert(appSource.includes("error.code ||= 'FOXBEAR_ANALYSIS_FALLBACK_TOO_LARGE'"));
assert(appSource.includes('output.getChannelData(ch).set(src.subarray(start, start + length));'));
assert(!appSource.includes('output.copyToChannel(src.slice(start, start + length), ch);'));
assert(appSource.split('\n').length - 1 < 13300, 'app.js must remain below the existing line budget');
assert(analysisWorkerSource.includes('__foxbearJobId: jobId'));
assert(pitchWorkerSource.includes('__foxbearJobId: jobId'));
assert(analysisWorkerSource.includes("postProgress(jobId, 68, '주파수 분석'"));
assert(pitchWorkerSource.includes("postProgress(jobId, 72, 'WSOLA 시간 변환'"));
assert(workerJobServiceSource.includes('if (data?.ok === false)'));
assert(appSource.includes('track.masteringJobId === masteringJobId && progress.percent >= 35'));

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert(from >= 0, `missing ${start}`);
  assert(to > from, `missing ${end}`);
  return source.slice(from, to);
}

function createBuffer(length = 64, channels = 2) {
  const data = Array.from({ length: channels }, (_, ch) => Float32Array.from({ length: Math.min(length, 256) }, (_v, i) => Math.sin((i + ch) / 8) * 0.1));
  return {
    length,
    numberOfChannels: channels,
    sampleRate: 48000,
    duration: length / 48000,
    getChannelData(ch) {
      const channel = data[ch] || data[0];
      return {
        slice() { return Float32Array.from(channel); },
        subarray(start, end) { return channel.subarray(start, end); }
      };
    }
  };
}

function loadPitchFunctions(overrides = {}) {
  const source = between(appSource, 'async function tryExternalPitchEngine', 'function applyTransformSafetyPolish');
  let toastCount = 0;
  const sandbox = {
    state: { pitchEngine: 'wsola', qualityMode: 'balanced' },
    cloneTransform: value => ({ ...(value || {}) }),
    DEFAULT_TRANSFORM: { pitchSemitones: 0, speedRatio: 1 },
    isDefaultTransform: value => Number(value.pitchSemitones || 0) === 0 && Number(value.speedRatio || 1) === 1,
    throwIfFoxBearOperationCancelled(signal, reason) {
      if (!signal?.aborted) return;
      const error = new Error(String(signal.reason || reason));
      error.name = 'AbortError';
      error.code = 'FOXBEAR_WORKER_JOB_CANCELLED';
      throw error;
    },
    isWorkerJobAbortError: error => error?.name === 'AbortError' || error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED',
    applyTransformSafetyPolish: value => value,
    runFoxBearWorkerJob: async () => ({ ok: true, sampleRate: 48000, channels: 2, length: 4, channelBuffers: [new Float32Array(4).buffer, new Float32Array(4).buffer] }),
    PITCH_WSOLA_WORKER_URL: 'pitch.worker.js',
    OPTIONAL_WASM_PITCH_ADAPTER_URL: './optional.js',
    makeAudioBuffer(channels, length, sampleRate) {
      const copied = [];
      return { numberOfChannels: channels, length, sampleRate, copied, copyToChannel(data, ch) { copied[ch] = Array.from(data); } };
    },
    resampleAudioBuffer() { throw new Error('unexpected main-thread resample'); },
    timeStretchAudioBuffer() { throw new Error('unexpected main-thread stretch'); },
    showToast() { toastCount += 1; },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    window: { Worker: true },
    console: { log() {}, warn() {}, error() {} },
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Promise,
    Error,
    DOMException,
    ...overrides
  };
  vm.runInNewContext(`${source}\nthis.preparePitchSpeedBuffer = preparePitchSpeedBuffer;`, sandbox);
  return { sandbox, getToastCount: () => toastCount };
}

async function testPitchWorkerOwnershipAndCancellation() {
  const controller = new AbortController();
  let captured = null;
  const { sandbox } = loadPitchFunctions({
    runFoxBearWorkerJob: async (path, payload, transfer, options) => {
      captured = { path, payload, transfer, options };
      return { ok: true, sampleRate: 48000, channels: 2, length: 4, channelBuffers: [new Float32Array(4).buffer, new Float32Array(4).buffer] };
    }
  });
  const output = await sandbox.preparePitchSpeedBuffer(createBuffer(64), { pitchSemitones: 2, speedRatio: 0.9 }, { signal: controller.signal, jobId: 'master:1:pitch' });
  assert.strictEqual(output.length, 4);
  assert.strictEqual(captured.path, 'pitch.worker.js');
  assert.strictEqual(captured.options.signal, controller.signal);
  assert.strictEqual(captured.options.jobId, 'master:1:pitch');
  assert.strictEqual(captured.transfer.length, 2);

  let fallbackCalls = 0;
  const abort = new Error('track removed');
  abort.name = 'AbortError';
  abort.code = 'FOXBEAR_WORKER_JOB_CANCELLED';
  const loaded = loadPitchFunctions({
    runFoxBearWorkerJob: async () => { throw abort; },
    resampleAudioBuffer() { fallbackCalls += 1; return {}; },
    timeStretchAudioBuffer() { fallbackCalls += 1; return {}; }
  });
  await assert.rejects(
    loaded.sandbox.preparePitchSpeedBuffer(createBuffer(64), { pitchSemitones: 2, speedRatio: 1 }, { signal: new AbortController().signal }),
    error => error?.name === 'AbortError'
  );
  assert.strictEqual(fallbackCalls, 0, 'cancelled pitch jobs must never enter synchronous fallback');
  assert.strictEqual(loaded.getToastCount(), 0, 'user cancellation must not show a worker fallback warning');
}

async function testLargePitchFallbackIsBlocked() {
  let fallbackCalls = 0;
  const loaded = loadPitchFunctions({
    runFoxBearWorkerJob: async () => { throw new Error('worker crashed'); },
    resampleAudioBuffer() { fallbackCalls += 1; return {}; },
    timeStretchAudioBuffer() { fallbackCalls += 1; return {}; }
  });
  await assert.rejects(
    loaded.sandbox.preparePitchSpeedBuffer(createBuffer(2000), { pitchSemitones: 3, speedRatio: 1 }, { fallbackMaxSamples: 1000 }),
    error => error?.code === 'FOXBEAR_PITCH_FALLBACK_TOO_LARGE'
  );
  assert.strictEqual(fallbackCalls, 0, 'large tracks must not freeze the UI with synchronous pitch fallback');
}

async function testAnalysisWorkerOwnershipAndLargeFallback() {
  const source = between(appSource, 'async function analyzeBufferAsync', 'function analyzeBuffer(buffer)');
  let captured = null;
  let fallbackCount = 0;
  const sandbox = {
    window: { Worker: true },
    runFoxBearWorkerJob: async (path, payload, transfer, options) => {
      captured = { path, payload, transfer, options };
      return { ok: true, analysis: { duration: payload.duration } };
    },
    ANALYSIS_WORKER_URL: 'analysis.worker.js',
    isWorkerJobAbortError: error => error?.name === 'AbortError',
    isAnalysisCancellationError: error => error?.code === 'FOXBEAR_ANALYSIS_CANCELLED',
    makeAnalysisCancelledError(stage) { const error = new Error(stage); error.name = 'AbortError'; error.code = 'FOXBEAR_ANALYSIS_CANCELLED'; return error; },
    analyzeBuffer() { fallbackCount += 1; return { fallback: true }; },
    console: { log() {}, warn() {}, error() {} },
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Promise,
    Error
  };
  vm.runInNewContext(`${source}\nthis.analyzeBufferAsync = analyzeBufferAsync;`, sandbox);
  const controller = new AbortController();
  const task = { id: 'track-1', signal: controller.signal, throwIfCancelled() { if (this.signal.aborted) throw new Error('cancelled'); } };
  const analysis = await sandbox.analyzeBufferAsync(createBuffer(64), task);
  assert.strictEqual(analysis.duration, 64 / 48000);
  assert.strictEqual(captured.options.signal, controller.signal);
  assert.strictEqual(captured.options.jobId, 'analysis:track-1');
  assert.strictEqual(fallbackCount, 0);

  sandbox.runFoxBearWorkerJob = async () => { throw new Error('analysis worker failed'); };
  await assert.rejects(
    sandbox.analyzeBufferAsync(createBuffer(25 * 1024 * 1024), task),
    error => error?.code === 'FOXBEAR_ANALYSIS_FALLBACK_TOO_LARGE'
  );
  assert.strictEqual(fallbackCount, 0, 'large analysis must not fall back to a blocking main-thread FFT');
}

function runWorker(source, payload) {
  const messages = [];
  const self = { postMessage(message) { messages.push(message); } };
  vm.runInNewContext(source, { self, console, Math, Number, String, Boolean, Object, Array, Float32Array, Float64Array, Error });
  self.onmessage({ data: payload });
  return messages;
}

async function testWorkerFailureIsDiagnosedAsFailure() {
  let worker = null;
  class FakeWorker {
    constructor() { this.terminated = false; worker = this; }
    postMessage(payload) { this.payload = payload; }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage?.({ data }); }
  }
  const fakeWindow = { setTimeout, clearTimeout };
  vm.runInNewContext(workerJobServiceSource, {
    window: fakeWindow, console, Date, Math, Number, String, Boolean, Object, Array, Map, Promise, Error, TypeError
  });
  const service = fakeWindow.FoxBearWorkerJobService;
  const pending = service.run({
    createWorker: () => new FakeWorker(),
    jobId: 'analysis:failure-qa',
    label: '오디오 분석',
    timeoutMs: 5000
  });
  worker.emit({ ok: false, error: 'FFT failed', code: 'FFT_FAILURE', errorName: 'DataError', __foxbearJobId: 'analysis:failure-qa' });
  await assert.rejects(pending, error => error?.message === 'FFT failed' && error?.code === 'FFT_FAILURE' && error?.jobId === 'analysis:failure-qa');
  assert.strictEqual(worker.terminated, true);
  const diagnostics = service.getDiagnostics();
  assert.strictEqual(diagnostics.activeCount, 0);
  assert.strictEqual(diagnostics.recent.at(-1).status, 'failed');
  assert.strictEqual(diagnostics.recent.at(-1).error, 'FFT failed');
}

function testWorkerProgressAndJobIdentity() {
  const analysisInput = new Float32Array(1024);
  for (let i = 0; i < analysisInput.length; i += 1) analysisInput[i] = Math.sin(i / 12) * 0.1;
  const analysisMessages = runWorker(analysisWorkerSource, { __foxbearJobId: 'analysis:qa', sampleRate: 48000, duration: analysisInput.length / 48000, channels: 1, length: analysisInput.length, channelBuffers: [analysisInput.buffer] });
  assert(analysisMessages.some(item => item.type === 'progress' && item.__foxbearJobId === 'analysis:qa'));
  assert.strictEqual(analysisMessages.at(-1).__foxbearJobId, 'analysis:qa');
  assert.strictEqual(analysisMessages.at(-1).ok, true);

  const pitchInput = new Float32Array(256);
  for (let i = 0; i < pitchInput.length; i += 1) pitchInput[i] = Math.sin(i / 8) * 0.1;
  const pitchMessages = runWorker(pitchWorkerSource, { __foxbearJobId: 'pitch:qa', sampleRate: 48000, channels: 1, length: pitchInput.length, transform: { pitchSemitones: 1, speedRatio: 0.9 }, qualityMode: 'fast', channelBuffers: [pitchInput.buffer] });
  assert(pitchMessages.some(item => item.type === 'progress' && item.__foxbearJobId === 'pitch:qa'));
  assert.strictEqual(pitchMessages.at(-1).__foxbearJobId, 'pitch:qa');
  assert.strictEqual(pitchMessages.at(-1).ok, true);
}

(async () => {
  await testPitchWorkerOwnershipAndCancellation();
  await testLargePitchFallbackIsBlocked();
  await testAnalysisWorkerOwnershipAndLargeFallback();
  await testWorkerFailureIsDiagnosedAsFailure();
  testWorkerProgressAndJobIdentity();
  console.log('PASS v1.5.91 cancellable decode/analysis/pitch pipeline and large-track performance guards');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
