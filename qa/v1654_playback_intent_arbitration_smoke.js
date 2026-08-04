#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('src/app.js', 'utf8');
const transitionSource = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');
const linkSource = fs.readFileSync('src/audio/playback-link-service.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.strictEqual(pkg.version, '1.6.58');
assert(pkg.qaChecks.includes('node qa/v1654_playback_intent_arbitration_smoke.js'));
assert(transitionSource.includes('function setPlaybackIntent(audio, playing, reason = \'transport\')'));
assert(transitionSource.includes('function isPlaybackIntended(audio)'));
assert(transitionSource.includes('settleSupersededPlayback(audio, target)'));
assert(transitionSource.includes("setPlaybackIntent(audio, false, options.reason || 'pause')"));
assert(linkSource.includes("transition.cancelPlaybackRequest(audio, { pause: true, reason: reason || 'exclusive-playback' })"));
assert(app.includes('function isAudioPlaybackIntended(audio)'));
assert(app.includes('if (!audio || !isAudioPlaybackIntended(audio)) playBottomPreviewAudio({ userGesture: true })'));
assert(app.includes("service.pauseWithFadeOut(current, { reason: 'media-session-pause' })"));
assert(app.includes("typeof audio._foxbearDesiredPlaying === 'boolean' ? audio._foxbearDesiredPlaying && !audio.ended"), 'background transport must preserve the latest requested state');
assert(app.includes("cancelAudioPlaybackRequest(other, 'legacy-exclusive-preview')"), 'exclusive preview must cancel pending starts');

let clock = 0;
let nextFrameId = 1;
const frames = new Map();
const fakeDocument = {
  querySelectorAll() { return []; },
  documentElement: {},
  body: {},
  createElement() { return {}; }
};
class FakeCustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}
const fakeWindow = {
  navigator: { userAgent: 'KAKAOTALK' },
  performance: { now: () => clock },
  setTimeout,
  clearTimeout,
  requestAnimationFrame(callback) {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame(id) { frames.delete(id); },
  dispatchEvent() {},
  CustomEvent: FakeCustomEvent,
  document: fakeDocument
};
const context = {
  window: fakeWindow,
  document: fakeDocument,
  CustomEvent: FakeCustomEvent,
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
vm.runInNewContext(linkSource, context);

const service = fakeWindow.FoxBearPlaybackTransitionService;
const linkService = fakeWindow.FoxBearPlaybackLinkService;

function flushFrames(at) {
  clock = at;
  const pending = Array.from(frames.values());
  frames.clear();
  pending.forEach(callback => callback(clock));
}

function createDeferredAudio() {
  const listeners = new Map();
  const playResolvers = [];
  const audio = {
    volume: 1,
    paused: true,
    ended: false,
    readyState: 4,
    isConnected: true,
    currentTime: 0,
    duration: 180,
    dataset: {},
    playCalls: 0,
    pauseCalls: 0,
    addEventListener(type, callback) {
      const group = listeners.get(type) || new Set();
      group.add(callback);
      listeners.set(type, group);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    dispatch(type) {
      for (const callback of Array.from(listeners.get(type) || [])) callback({ type, target: audio });
    },
    play() {
      this.playCalls += 1;
      return new Promise(resolve => {
        playResolvers.push(() => {
          this.paused = false;
          this.dispatch('play');
          resolve();
        });
      });
    },
    pause() {
      this.pauseCalls += 1;
      const changed = !this.paused;
      this.paused = true;
      if (changed) this.dispatch('pause');
    },
    resolveNextPlay() {
      const resolve = playResolvers.shift();
      if (resolve) resolve();
    },
    closest() { return null; }
  };
  return audio;
}

(async () => {
  const audio = createDeferredAudio();
  const firstPlay = service.playWithFadeIn(audio, { ms: 60 });
  assert.strictEqual(service.isPlaybackIntended(audio), true, 'play intent was not visible before play() settled');
  const pause = service.pauseWithFadeOut(audio, { ms: 60 });
  assert.strictEqual(service.isPlaybackIntended(audio), false, 'second tap did not become the latest pause intent');
  assert(audio.pauseCalls >= 1, 'pause intent did not abort a pending play request');
  audio.resolveNextPlay();
  assert.strictEqual(await pause, true, 'pending pause intent did not settle');
  assert.strictEqual(await firstPlay, false, 'superseded play request reported success');
  assert.strictEqual(audio.paused, true, 'late play completion overrode the latest pause intent');

  const rapid = createDeferredAudio();
  const rapidFirstPlay = service.playWithFadeIn(rapid, { ms: 60 });
  await service.pauseWithFadeOut(rapid, { ms: 60 });
  const rapidLastPlay = service.playWithFadeIn(rapid, { ms: 60 });
  rapid.resolveNextPlay();
  await Promise.resolve();
  assert.strictEqual(await rapidFirstPlay, false, 'first rapid play request should be superseded');
  assert.strictEqual(rapid.paused, false, 'stale first play should not pause a newer play intent');
  rapid.resolveNextPlay();
  await Promise.resolve();
  await Promise.resolve();
  assert(frames.size >= 1, 'latest play did not schedule its fade');
  flushFrames(120);
  assert.strictEqual(await rapidLastPlay, true, 'latest rapid play intent did not win');
  assert.strictEqual(service.isPlaybackIntended(rapid), true);
  assert.strictEqual(rapid.paused, false);

  const pendingOther = createDeferredAudio();
  const active = createDeferredAudio();
  linkService.registerAudio(pendingOther, { role: 'inline-preview' });
  linkService.registerAudio(active, { role: 'bottom-dock' });
  const pendingStart = service.playWithFadeIn(pendingOther, { ms: 60 });
  assert.strictEqual(service.isPlaybackIntended(pendingOther), true);
  linkService.pauseAllExcept(active, 'intent-arbitration-test');
  assert.strictEqual(service.isPlaybackIntended(pendingOther), false, 'exclusive playback did not cancel a pending competing start');
  pendingOther.resolveNextPlay();
  assert.strictEqual(await pendingStart, false);
  assert.strictEqual(pendingOther.paused, true, 'pending competing audio started after exclusive pause');

  console.log('PASS v1.6.54 rapid playback intent arbitration and pending exclusive cancellation');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
