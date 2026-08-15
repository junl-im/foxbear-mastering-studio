#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workerSource = fs.readFileSync('src/utils/worker-job-service.js', 'utf8');
const appSource = fs.readFileSync('src/app.js', 'utf8');
const lifecycleSource = fs.readFileSync('src/state/track-lifecycle-service.js', 'utf8');
const playbackLinkSource = fs.readFileSync('src/audio/playback-link-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.103');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert(pkg.qaChecks.includes('node qa/v1583_worker_dock_ownership_smoke.js'));
assert(workerSource.includes('function getDiagnostics()'));
assert(workerSource.includes('estimatedRemainingMs'));
assert(appSource.includes('workerJobs: getWorkerJobService()?.getDiagnostics?.() || null'));
assert(appSource.includes("if (audioTrackId && audioTrackId !== String(track.id || '')) return null;"));
assert(lifecycleSource.includes("track.masteringAbortController?.abort?.('track-resources-released')"));
assert(playbackLinkSource.includes('delete audio.dataset.trackId'));
assert(playbackLinkSource.includes('delete audio.dataset.absoluteStartSec'));

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert(from >= 0, `missing ${start}`);
  assert(to > from, `missing ${end}`);
  return source.slice(from, to);
}

async function testWorkerLifecycleDiagnostics() {
  let worker = null;
  class FakeWorker {
    constructor() { this.terminated = false; worker = this; }
    postMessage(payload) { this.payload = payload; }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage?.({ data }); }
  }
  const fakeWindow = { setTimeout, clearTimeout };
  vm.runInNewContext(workerSource, {
    window: fakeWindow, console, Date, Math, Number, String, Boolean, Object, Array, Map, Promise, Error, TypeError
  });
  const service = fakeWindow.FoxBearWorkerJobService;
  const controller = new AbortController();
  const progress = [];
  const pending = service.run({
    createWorker: () => new FakeWorker(), jobId: 'master:track:encode', label: 'WAV 인코딩',
    signal: controller.signal, timeoutMs: 5000, onProgress: item => progress.push(item)
  });
  assert.strictEqual(service.getDiagnostics().activeCount, 1);
  worker.emit({ type: 'progress', __foxbearJobId: 'master:track:encode', percent: 40, stage: 'WAV', detail: 'working' });
  assert.strictEqual(progress.length, 1);
  assert.strictEqual(progress[0].percent, 40);
  assert(progress[0].estimatedRemainingMs >= 0);
  assert.strictEqual(service.getDiagnostics().active[0].stage, 'WAV');
  controller.abort('track-removed');
  await assert.rejects(pending, error => error?.name === 'AbortError');
  assert.strictEqual(worker.terminated, true);
  const after = service.getDiagnostics();
  assert.strictEqual(after.activeCount, 0);
  assert.strictEqual(after.recent.at(-1).status, 'cancelled');
}

function testTrackReleaseCancelsBothJobs() {
  const fakeWindow = { crypto: null, URL: { createObjectURL: () => 'blob:input', revokeObjectURL() {} } };
  vm.runInNewContext(lifecycleSource, { window: fakeWindow, URL: fakeWindow.URL, console, Date, Math, Object, Array, JSON });
  const service = fakeWindow.FoxBearTrackLifecycleService;
  let masteringAborts = 0;
  let previewAborts = 0;
  const track = {
    masteringAbortController: { abort() { masteringAborts += 1; } }, masteringJobId: 'master-1',
    masterPreviewAbortController: { abort() { previewAborts += 1; } }, masterPreviewJobId: 'preview-1',
    originalUrl: 'blob:input', masteredUrl: null, masterPreviewUrl: null, masteredBuffer: {}, masterPreviewBlob: {}, masterPreviewInfo: {}, outBlob: {}
  };
  service.releaseTrackResources(track, { revokeObjectURL() {} });
  assert.strictEqual(masteringAborts, 1);
  assert.strictEqual(previewAborts, 1);
  assert.strictEqual(track.masteringJobId, '');
  assert.strictEqual(track.masterPreviewJobId, '');
}

function testDockTransportRejectsWrongOwner() {
  const source = between(appSource, 'function captureBottomPreviewTransport', 'function getPendingBottomPreviewTransport');
  const oldTransport = { trackId: 'old', absoluteSec: 12 };
  const sandbox = {
    state: { bottomPreviewMode: 'original', bottomPreviewTransport: oldTransport, previewTranslationMode: 'studio' },
    getSelectedTrack: () => ({ id: 'new' }),
    getBottomPreviewAudio: () => ({ dataset: { trackId: 'old' }, currentTime: 73, paused: false, ended: false }),
    getDockAudioTrackId: audio => String(audio?.dataset?.trackId || ''),
    localToAbsolutePreviewTime: (_track, _mode, value) => value,
    Date, Number, String, Math
  };
  vm.runInNewContext(`${source}\nthis.captureBottomPreviewTransport = captureBottomPreviewTransport;`, sandbox);
  const result = sandbox.captureBottomPreviewTransport({ id: 'new' }, 'original');
  assert.strictEqual(result, null);
  assert.strictEqual(sandbox.state.bottomPreviewTransport, oldTransport, 'wrong-owner audio must not overwrite the transport lease');
}

function testInactiveCrossfadeCannotOverwriteMediaSession() {
  const source = between(appSource, 'function getDockAudioTrackId', 'function seekDockAudioBy');
  const handlers = {};
  const mediaSession = {
    metadata: null, playbackState: 'none',
    setActionHandler(action, handler) { handlers[action] = handler; },
    setPositionState(value) { this.position = value; }
  };
  const activeAudio = { dataset: { trackId: 'new', bottomPreviewActive: 'true' }, paused: false, playbackRate: 1, currentTime: 5, duration: 100 };
  const staleAudio = { dataset: { trackId: 'old', bottomPreviewActive: 'false' }, paused: true, playbackRate: 1, currentTime: 80, duration: 120 };
  const sandbox = {
    navigator: { mediaSession },
    MediaMetadata: function MediaMetadata(value) { return value; },
    state: { tracks: [{ id: 'old', name: 'Old song', analysis: { duration: 120 } }, { id: 'new', name: 'New song', analysis: { duration: 100 } }], bottomPreviewTrackId: 'new', bottomPreviewMode: 'original' },
    getSelectedTrack: () => sandbox.state.tracks[1],
    getBottomPreviewAudio: () => activeAudio,
    getBottomPreviewGenreLabel: () => 'Test',
    playBottomPreviewAudio() {},
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
    console, Math, Number, String
  };
  vm.runInNewContext(`${source}\nthis.syncMediaSessionForDock = syncMediaSessionForDock;`, sandbox);
  sandbox.syncMediaSessionForDock(staleAudio);
  assert(mediaSession.metadata.title.includes('New song'), 'inactive legacy audio overwrote the current MediaSession metadata');
  assert.strictEqual(mediaSession.playbackState, 'playing');
  assert.strictEqual(mediaSession.position.position, 5);
}

(async () => {
  await testWorkerLifecycleDiagnostics();
  testTrackReleaseCancelsBothJobs();
  testDockTransportRejectsWrongOwner();
  testInactiveCrossfadeCannotOverwriteMediaSession();
  console.log('PASS v1.5.83 worker lifecycle and Dock ownership diagnostics');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
