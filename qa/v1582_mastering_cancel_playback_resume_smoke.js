#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const appSource = fs.readFileSync('src/app.js', 'utf8');
const playbackSource = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.2');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert(pkg.qaChecks.includes('node qa/v1582_mastering_cancel_playback_resume_smoke.js'));
assert(appSource.includes("status: cancelled ? 'cancelled' : 'error'"));
assert(appSource.includes("if (cancelled) throw"));
assert(!appSource.includes("if (options.play !== false) audio.play().catch"));
assert(playbackSource.includes('function retryInterruptedPlay'));
assert(playbackSource.includes("options.retryInterrupted === false"));

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0, `missing start marker: ${startMarker}`);
  assert(end > start, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

async function testQualityRecoveryCancellationPropagation() {
  const source = sourceBetween(appSource, 'async function runQualityGateRecoveryAttempt', 'async function masterTrack');
  let incidentCount = 0;
  const abortError = new Error('batch-cancelled');
  abortError.name = 'AbortError';
  abortError.code = 'FOXBEAR_WORKER_JOB_CANCELLED';
  const sandbox = {
    getMasteringOrchestratorService: () => ({
      createQualityRecoveryPlan: () => ({
        profileId: 'safe', profileLabel: 'Safe', profileIds: ['safe'], riskCodes: ['PHASE_RISK'], adjustments: [],
        reason: 'test', safeSettings: { strength: 0.1 }, targetLufs: -14, ceilingDb: -1, qualityMode: 'fast', truePeak: false
      })
    }),
    FoxBearInAppMasteringSafetyService: { shouldPreserveFirstRender: () => false },
    cloneSettings: value => ({ ...(value || {}) }),
    state: { ceilingDb: -1 },
    resolveTargetLufsForTrack: () => -14,
    scheduleRenderAll() {},
    yieldToBrowser: () => Promise.resolve(),
    renderMasterBuffer: () => Promise.reject(abortError),
    getErrorMessage: error => error.message,
    isWorkerJobAbortError: error => error?.name === 'AbortError' || error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED',
    getWorkerJobService: () => ({ makeAbortError(reason) { const error = new Error(String(reason)); error.name = 'AbortError'; error.code = 'FOXBEAR_WORKER_JOB_CANCELLED'; return error; } }),
    reportOperationalIncident: () => { incidentCount += 1; },
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Promise,
    Error
  };
  vm.runInNewContext(`${source}\nthis.runQualityGateRecoveryAttempt = runQualityGateRecoveryAttempt;`, sandbox);
  const originalSettings = { strength: 0.7 };
  const track = {
    settings: { ...originalSettings }, qualityGate: { status: 'fail' }, finalizeInfo: {}, engineRecoveryInfo: null,
    performanceGuardInfo: { mode: 'first' }, masterReport: { first: true }, comparison: {}, waveformOverview: [],
    safetyInfo: {}, truePeakInfo: {}, exportFallbackInfo: null, progress: 99, report: 'first render'
  };
  const signal = { aborted: true, reason: 'batch-cancelled' };
  await assert.rejects(
    sandbox.runQualityGateRecoveryAttempt(track, { preparedBuffer: {}, signal }),
    error => error?.name === 'AbortError'
  );
  assert.deepStrictEqual(track.settings, originalSettings, 'cancelled recovery must restore the original mastering settings');
  assert.strictEqual(track.engineRecoveryInfo.status, 'cancelled');
  assert.strictEqual(track.engineRecoveryInfo.preservedFirstRender, true);
  assert.strictEqual(incidentCount, 0, 'user cancellation must not be reported as an operational failure');
}

function loadPlaybackService() {
  let now = 0;
  const frames = new Map();
  let nextFrameId = 1;
  const fakeWindow = {
    navigator: { userAgent: '' },
    performance: { now: () => now },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) { const id = nextFrameId++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.runInNewContext(playbackSource, { window: fakeWindow, console, Date, Math, Number, String, Boolean, Object, Array, Promise, Error });
  return { service: fakeWindow.FoxBearPlaybackTransitionService, flush(value = 200) { now = value; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); } };
}

async function testInterruptedFirstPlayRetry() {
  const { service } = loadPlaybackService();
  let resumeCalls = 0;
  const audio = {
    volume: 1, paused: true, ended: false, readyState: 4, isConnected: true, dataset: {}, playCalls: 0,
    _foxbearResumeAudioGraph() { resumeCalls += 1; return Promise.resolve(); },
    play() {
      this.playCalls += 1;
      if (this.playCalls === 1) { const error = new Error('play() request was interrupted after foreground return'); error.name = 'AbortError'; return Promise.reject(error); }
      this.paused = false;
      return Promise.resolve();
    },
    pause() { this.paused = true; }, addEventListener() {}, removeEventListener() {}, load() {}
  };
  const result = await service.playWithFadeIn(audio, { fromZero: false });
  assert.strictEqual(result, true);
  assert.strictEqual(audio.playCalls, 2, 'a still-owned interrupted play must retry exactly once');
  assert.strictEqual(resumeCalls, 1);
  assert.strictEqual(audio.paused, false);
}

async function testSupersededPlayDoesNotRetry() {
  const { service } = loadPlaybackService();
  let rejectFirst;
  const audio = {
    volume: 1, paused: true, ended: false, readyState: 4, isConnected: true, dataset: {}, playCalls: 0,
    play() { this.playCalls += 1; return new Promise((resolve, reject) => { rejectFirst = reject; }); },
    pause() { this.paused = true; }, addEventListener() {}, removeEventListener() {}, load() {}
  };
  const pending = service.playWithFadeIn(audio, { fromZero: false });
  service.cancelPlaybackRequest(audio, { reason: 'new-source', pause: true });
  const error = new Error('play() request was interrupted by a new load request'); error.name = 'AbortError';
  rejectFirst(error);
  assert.strictEqual(await pending, false);
  assert.strictEqual(audio.playCalls, 1, 'a stale play request must never retry');
}

(async () => {
  await testQualityRecoveryCancellationPropagation();
  await testInterruptedFirstPlayRetry();
  await testSupersededPlayDoesNotRetry();
  console.log('PASS v1.5.82 mastering cancellation propagation and foreground play retry ownership');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
