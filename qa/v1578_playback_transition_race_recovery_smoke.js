#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.strictEqual(pkg.version, '1.6.83');
assert(pkg.qaChecks.includes('node qa/v1578_playback_transition_race_recovery_smoke.js'));
assert(source.includes('audio._foxbearFadeState'));
assert(source.includes('fadeState.resolve(false)'));
assert(source.includes('if (!completed) return false;'));
assert(source.includes('if (results.some(completed => completed === false)) {'));
assert(source.includes('if (!completed && ownsRequest && connected) audio.volume = target;'));

let clock = 0;
let nextFrameId = 1;
const frames = new Map();
const fakeWindow = {
  navigator: { userAgent: '' },
  performance: { now: () => clock },
  setTimeout,
  clearTimeout,
  requestAnimationFrame(callback) {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame(id) {
    frames.delete(id);
  }
};

vm.runInNewContext(source, {
  window: fakeWindow,
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
});

const service = fakeWindow.FoxBearPlaybackTransitionService;

function flushFrames(at) {
  clock = at;
  const pending = Array.from(frames.entries());
  frames.clear();
  pending.forEach(([, callback]) => callback(clock));
}

function createAudio() {
  return {
    volume: 1,
    paused: false,
    ended: false,
    readyState: 4,
    dataset: {},
    pauseCalls: 0,
    playCalls: 0,
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    },
    play() {
      this.playCalls += 1;
      this.paused = false;
      return Promise.resolve();
    },
    addEventListener() {},
    removeEventListener() {},
    load() {}
  };
}

(async () => {
  const fadeAudio = createAudio();
  const firstFade = service.fadeVolume(fadeAudio, 0, 100);
  assert.strictEqual(frames.size, 1, 'first fade frame was not scheduled');
  const secondFade = service.fadeVolume(fadeAudio, 0.5, 100);
  assert.strictEqual(await firstFade, false, 'cancelled fade promise did not settle as cancelled');
  assert.strictEqual(frames.size, 1, 'cancelled fade frame was not replaced cleanly');
  flushFrames(100);
  assert.strictEqual(await secondFade, true, 'replacement fade did not complete');
  assert.strictEqual(fadeAudio._foxbearFadeState, null, 'completed fade retained its controller');
  assert.strictEqual(fadeAudio._foxbearFadeRaf, 0, 'completed fade retained its animation frame');

  const raceAudio = createAudio();
  const pendingPause = service.pauseWithFadeOut(raceAudio, { ms: 100 });
  assert.strictEqual(frames.size, 1, 'pause fade frame was not scheduled');
  const pendingPlay = service.playWithFadeIn(raceAudio, { ms: 100, fromZero: false });
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(await pendingPause, false, 'superseded pause did not report cancellation');
  assert.strictEqual(await pendingPlay, true, 'replacement play did not complete');
  assert.strictEqual(raceAudio.pauseCalls, 0, 'cancelled fade-out paused audio after a newer play request');
  assert.strictEqual(raceAudio.playCalls, 1, 'replacement play was not issued exactly once');
  assert.strictEqual(raceAudio.paused, false, 'audio ended paused after rapid pause/play transition');

  const cancelledPlayAudio = createAudio();
  cancelledPlayAudio.paused = true;
  const cancelledPlay = service.playWithFadeIn(cancelledPlayAudio, { ms: 100 });
  await Promise.resolve();
  await Promise.resolve();
  service.cancelFade(cancelledPlayAudio);
  assert.strictEqual(await cancelledPlay, false, 'externally cancelled play fade should report cancellation');
  assert.strictEqual(cancelledPlayAudio.volume, 1, 'cancelled play fade should restore the remembered audible volume');

  const oldAudio = createAudio();
  const nextAudio = createAudio();
  nextAudio.paused = true;
  const crossfade = service.crossfadePair(oldAudio, nextAudio, { ms: 100, userGesture: true });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(frames.size, 2, 'crossfade frames were not scheduled');
  service.cancelFade(oldAudio);
  flushFrames(200);
  assert.strictEqual(await crossfade, false, 'cancelled crossfade did not report stale completion');
  assert.strictEqual(oldAudio.pauseCalls, 0, 'cancelled crossfade paused the previous source after a newer transition');
  assert.strictEqual(oldAudio.volume, 1, 'cancelled crossfade should restore the previous source volume');
  assert.strictEqual(nextAudio.volume, 1, 'cancelled crossfade should restore the next source volume');

  console.log('PASS v1.5.78 playback fade cancellation, rapid pause/play, and stale crossfade recovery');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
