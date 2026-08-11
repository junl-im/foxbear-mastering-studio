#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const transitionSource = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');
const recoverySource = fs.readFileSync('src/audio/playback-source-recovery-service.js', 'utf8');
const lifecycleSource = fs.readFileSync('src/audio/playback-lifecycle-recovery-service.js', 'utf8');
const trackLifecycleSource = fs.readFileSync('src/state/track-lifecycle-service.js', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.strictEqual(pkg.version, '1.6.89');
assert(pkg.qaChecks.includes('node --check src/audio/playback-source-recovery-service.js'));
assert(pkg.qaChecks.includes('node qa/v1656_playback_blob_source_resilience_smoke.js'));
assert(recoverySource.includes('function backingBlobForMode(track, mode)'));
assert(recoverySource.includes('async function repairAudio(audio, options = {})'));
assert(recoverySource.includes('function retireObjectUrl(track, url, options = {})'));
assert(transitionSource.includes("function reconcileAudibleVolume(audio, reason = 'audible-volume-reconcile')"));
assert(lifecycleSource.includes('audio._foxbearSourceRecoveryPending || audio.error'));
assert(trackLifecycleSource.includes('FoxBearPlaybackSourceRecoveryService?.releaseTrack?.(track'));
assert(app.includes("recoverPlaybackSource('dock-source-error')"));
assert(app.includes("recoverPlaybackSource('dock-source-emptied')"));
assert(app.includes('retirePlaybackObjectUrl(track, previousMasteredUrl)'));
assert(index.includes('src/audio/playback-source-recovery-service.js?v=1.6.89-mobile-header-flex-ownership-browser-gate-recovery'));
assert(sw.includes("'./src/audio/playback-source-recovery-service.js?v=1.6.89-mobile-header-flex-ownership-browser-gate-recovery'"));

const audios = [];
const revoked = [];
let urlId = 0;
const fakeDocument = {
  visibilityState: 'visible',
  querySelectorAll(selector) {
    return selector === 'audio' ? audios : [];
  }
};
const fakeWindow = {
  document: fakeDocument,
  navigator: { userAgent: 'KAKAOTALK' },
  performance: { now: () => Date.now() },
  setTimeout,
  clearTimeout,
  requestAnimationFrame: callback => setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: clearTimeout,
  URL: {
    createObjectURL() { urlId += 1; return `blob:recovered-${urlId}`; },
    revokeObjectURL(url) { revoked.push(url); }
  }
};
const context = {
  window: fakeWindow,
  document: fakeDocument,
  console,
  Date,
  Math,
  Number,
  String,
  Boolean,
  Object,
  Array,
  Set,
  Map,
  WeakMap,
  Promise,
  Error
};
vm.runInNewContext(transitionSource, context);
vm.runInNewContext(recoverySource, context);

const transition = fakeWindow.FoxBearPlaybackTransitionService;
const recovery = fakeWindow.FoxBearPlaybackSourceRecoveryService;

function createAudio(src = 'blob:old-master') {
  const listeners = new Map();
  const audio = {
    src,
    currentSrc: src,
    currentTime: 31.5,
    duration: 180,
    readyState: 4,
    networkState: 1,
    volume: 0.8,
    muted: false,
    paused: true,
    ended: false,
    isConnected: true,
    dataset: { trackId: 'track-1', spectrumMode: 'mastered', foxbearTargetVolume: '0.8' },
    playCalls: 0,
    pauseCalls: 0,
    getAttribute(name) { return name === 'src' ? this.src : null; },
    addEventListener(type, handler) {
      const set = listeners.get(type) || new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type, handler) { listeners.get(type)?.delete(handler); },
    dispatch(type) { listeners.get(type)?.forEach(handler => handler({ type, target: this })); },
    closest() { return null; },
    load() { this.currentSrc = this.src; this.readyState = 4; },
    play() { this.playCalls += 1; this.paused = false; return Promise.resolve(); },
    pause() { this.pauseCalls += 1; this.paused = true; }
  };
  audios.push(audio);
  return audio;
}

(async () => {
  const track = {
    id: 'track-1',
    masteredUrl: 'blob:old-master',
    outBlob: { size: 4096, type: 'audio/wav' }
  };
  const audio = createAudio();
  transition.setPlaybackIntent(audio, true, 'before-source-failure');
  const controller = recovery.createController({
    document: fakeDocument,
    getTrackById: id => id === track.id ? track : null,
    getSelectedTrack: () => track,
    getTransitionService: () => transition,
    createObjectURL: fakeWindow.URL.createObjectURL,
    revokeObjectURL: fakeWindow.URL.revokeObjectURL
  });
  const result = await controller.repairAudio(audio, { track, mode: 'mastered', shouldResume: true });
  assert.strictEqual(result.recovered, true, 'backing Blob source was not recovered');
  assert.strictEqual(result.resumed, true, 'playback intent was not resumed after source recovery');
  assert.strictEqual(track.masteredUrl, 'blob:recovered-1');
  assert.strictEqual(audio.src, 'blob:recovered-1');
  assert.strictEqual(audio.currentTime, 31.5, 'playback position was not preserved');
  assert.strictEqual(audio.playCalls, 1);
  assert(revoked.includes('blob:old-master'), 'superseded source URL was not retired');

  const audible = createAudio('blob:audible');
  audible.paused = false;
  audible.volume = 0.0001;
  audible.dataset.foxbearTargetVolume = '0.7';
  assert.strictEqual(transition.reconcileAudibleVolume(audible, 'route-change'), true);
  assert.strictEqual(audible.volume, 0.7, 'stale fade volume was not restored');

  const held = createAudio('blob:held-old');
  controller.retireObjectUrl(track, 'blob:held-old', { recheckMs: 100000 });
  assert(!revoked.includes('blob:held-old'), 'URL still used by a connected player was revoked early');
  held.src = 'blob:new-source';
  held.currentSrc = held.src;
  assert.strictEqual(controller.flushRetiredUrls(track), 1);
  assert(revoked.includes('blob:held-old'), 'released URL was not revoked after the player moved');

  const missingTrack = { id: 'track-missing', masteredUrl: 'blob:missing', outBlob: null };
  const missingAudio = createAudio('blob:missing');
  missingAudio.dataset.trackId = 'track-missing';
  transition.setPlaybackIntent(missingAudio, true, 'missing-backing-blob');
  const missingController = recovery.createController({
    document: fakeDocument,
    getTrackById: id => id === missingTrack.id ? missingTrack : null,
    getSelectedTrack: () => missingTrack,
    getTransitionService: () => transition,
    createObjectURL: fakeWindow.URL.createObjectURL,
    revokeObjectURL: fakeWindow.URL.revokeObjectURL
  });
  const missing = await missingController.repairAudio(missingAudio, { track: missingTrack, mode: 'mastered' });
  assert.strictEqual(missing.recovered, false);
  assert.strictEqual(transition.isPlaybackIntended(missingAudio), false, 'failed recovery left a stale playing intent');

  console.log('PASS v1.6.56 playback Blob source recovery, deferred URL retirement, and audible volume reconciliation');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
