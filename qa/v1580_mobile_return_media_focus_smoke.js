#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const appSource = fs.readFileSync('src/app.js', 'utf8');
const contextSource = fs.readFileSync('src/audio/audio-context-manager.js', 'utf8');
const downloadSource = fs.readFileSync('src/download/download-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.83');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert(pkg.qaChecks.includes('node qa/v1580_mobile_return_media_focus_smoke.js'));
assert(appSource.includes("reason: 'visibility-hidden', ttlMs: 12 * 60 * 60 * 1000"));
assert(appSource.includes("navigator.mediaSession.setActionHandler(action, null)"));
assert(appSource.includes('mobile.lastDockRestoreAt'));
assert(contextSource.includes("context.state === 'running' || context.state === 'closed'"));
assert(contextSource.includes("pushEvent('resume-join'"));
assert(downloadSource.includes("actions.querySelectorAll('button, a')"));
assert(downloadSource.includes('document.body.contains(button)'));
assert(downloadSource.includes("open.addEventListener('click'"));

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0, `missing start marker: ${startMarker}`);
  assert(end > start, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

async function testInterruptedContextResumeDeduplication() {
  const listeners = new Map();
  const fakeWindow = {
    FoxBearBuildInfo: { assetVersion: '1.6.83-browser-ui-mode-fixture-source-hygiene-recovery' },
    addEventListener(type, handler) { listeners.set(type, handler); }
  };
  vm.runInNewContext(contextSource, {
    window: fakeWindow,
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Map,
    Set,
    WeakMap,
    Promise,
    Error
  });
  const manager = fakeWindow.FoxBearAudioContextManager;
  let resolveResume;
  const context = {
    state: 'interrupted',
    resumeCalls: 0,
    addEventListener() {},
    resume() {
      this.resumeCalls += 1;
      return new Promise(resolve => {
        resolveResume = () => {
          this.state = 'running';
          resolve();
        };
      });
    },
    close() { this.state = 'closed'; return Promise.resolve(); }
  };
  manager.register(context, { purpose: 'preview-translation', ownerId: 'dock' });
  const first = manager.resume(context, 'foreground-return');
  const second = manager.resume(context, 'play-gesture');
  await Promise.resolve();
  assert.strictEqual(context.resumeCalls, 1, 'concurrent interrupted-context resumes must share one native resume call');
  resolveResume();
  await Promise.all([first, second]);
  const diagnostics = manager.getDiagnostics();
  assert.strictEqual(diagnostics.runningCount, 1);
  assert.strictEqual(diagnostics.contexts[0].resumeCount, 1);
  assert.strictEqual(diagnostics.contexts[0].resumePending, false);
  assert(diagnostics.events.some(event => event.type === 'resume-join'));
}

function testMediaSessionStaleHandlerCleanup() {
  const syncSource = sourceBetween(appSource, 'function syncMediaSessionForDock', 'function seekDockAudioBy');
  const handlers = new Map();
  const mediaSession = {
    playbackState: 'playing',
    metadata: { stale: true },
    positionCleared: false,
    setActionHandler(action, handler) { handlers.set(action, handler); },
    setPositionState(value) { if (arguments.length === 0) this.positionCleared = true; else this.position = value; }
  };
  let selectedTrack = null;
  let currentAudio = null;
  let playCalls = 0;
  const sandbox = {
    navigator: { mediaSession },
    MediaMetadata: class MediaMetadata { constructor(data) { Object.assign(this, data); } },
    state: { bottomPreviewMode: 'original' },
    getSelectedTrack: () => selectedTrack,
    getDockAudioTrackId: audio => String(audio?.dataset?.trackId || audio?.dataset?.spectrumTrackId || ''),
    getBottomPreviewAudio: () => currentAudio,
    getBottomPreviewGenreLabel: () => 'Pop',
    playBottomPreviewAudio: () => { playCalls += 1; },
    seekDockAudioBy: () => {},
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
    console,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Math,
    MediaMetadataError: Error
  };
  vm.runInNewContext(`${syncSource}\nthis.syncMediaSessionForDock = syncMediaSessionForDock;`, sandbox);
  sandbox.syncMediaSessionForDock();
  assert.strictEqual(mediaSession.playbackState, 'none');
  assert.strictEqual(mediaSession.metadata, null);
  assert.strictEqual(mediaSession.positionCleared, true);
  ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'].forEach(action => assert.strictEqual(handlers.get(action), null));

  const oldAudio = { paused: false, currentTime: 4, duration: 120, playbackRate: 1, pauseCalls: 0, pause() { this.pauseCalls += 1; this.paused = true; } };
  const newAudio = { paused: false, currentTime: 8, duration: 120, playbackRate: 1, pauseCalls: 0, pause() { this.pauseCalls += 1; this.paused = true; } };
  selectedTrack = { name: 'Track', analysis: { duration: 120 } };
  currentAudio = oldAudio;
  sandbox.syncMediaSessionForDock(oldAudio);
  currentAudio = newAudio;
  handlers.get('pause')();
  assert.strictEqual(oldAudio.pauseCalls, 0, 'MediaSession pause must not retain the replaced audio element');
  assert.strictEqual(newAudio.pauseCalls, 1);
  handlers.get('seekto')({ seekTime: 42 });
  assert.strictEqual(newAudio.currentTime, 42);
  handlers.get('play')();
  assert.strictEqual(playCalls, 1);
}

function testLongLockTransportLease() {
  const transportSource = sourceBetween(appSource, 'function localToAbsolutePreviewTime', 'function applyBottomPreviewStart');
  let now = 1000;
  class FakeDate extends Date {}
  FakeDate.now = () => now;
  const track = { id: 'track-1' };
  const audio = { currentTime: 37.5, paused: false, ended: false };
  const sandbox = {
    state: { bottomPreviewMode: 'original', previewTranslationMode: 'studio', bottomPreviewTransport: null },
    getSelectedTrack: () => track,
    getBottomPreviewAudio: () => audio,
    getDockAudioTrackId: audioValue => String(audioValue?.dataset?.trackId || audioValue?.dataset?.spectrumTrackId || ''),
    getMasterPreviewStartSec: () => 0,
    getTrackHighlightStart: () => 0,
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
    Date: FakeDate,
    Number,
    String,
    Boolean,
    Object,
    Math
  };
  vm.runInNewContext(`${transportSource}\nthis.captureBottomPreviewTransport = captureBottomPreviewTransport; this.getPendingBottomPreviewTransport = getPendingBottomPreviewTransport;`, sandbox);
  sandbox.captureBottomPreviewTransport(track, 'original', { reason: 'visibility-hidden', ttlMs: 12 * 60 * 60 * 1000 });
  now += 2 * 60 * 60 * 1000;
  let pending = sandbox.getPendingBottomPreviewTransport(track, 'original', 120, false);
  assert.strictEqual(pending.startSec, 37.5, 'screen-lock return should retain position beyond the old 60-second limit');
  assert.strictEqual(pending.playing, true);
  now += 11 * 60 * 60 * 1000;
  pending = sandbox.getPendingBottomPreviewTransport(track, 'original', 120, false);
  assert.strictEqual(pending.startSec, 0, 'expired transport leases must not revive stale playback');
  assert.strictEqual(pending.playing, false);
}

(async () => {
  await testInterruptedContextResumeDeduplication();
  testMediaSessionStaleHandlerCleanup();
  testLongLockTransportLease();
  console.log('PASS v1.5.80 interrupted audio context, long-lock transport, MediaSession cleanup, and save/share focus recovery');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
