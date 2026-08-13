#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('src/app.js', 'utf8');
const source = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.strictEqual(pkg.version, '1.6.95');
assert(pkg.qaChecks.includes('node qa/v1653_playback_crossfade_settlement_smoke.js'));
assert(source.includes('function waitForMediaReady(audio, timeoutMs = 900, options = {})'));
assert(source.includes('{ load: !immediatePlay }'), 'user-gesture crossfade readiness must not reload after play()');
assert(app.includes('Promise.resolve(crossfadeAudioPair('), 'Dock crossfade result should be observed');
assert(app.includes('if (!completed) settleCrossfade(false);'), 'resolved-false crossfades must be settled');
assert(app.includes("classList.remove('is-crossfading')"), 'crossfade shell state must be released');
assert.strictEqual((app.match(/state\.bottomPreviewMode === 'mastered' && !masteredAvailable/g) || []).length, 1, 'duplicate mastered availability guard should be removed');
assert(app.split(/\r?\n/).length < 13300, 'app line budget should remain intact');

let clock = 0;
let nextFrameId = 1;
const frames = new Map();
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
  const pending = Array.from(frames.values());
  frames.clear();
  pending.forEach(callback => callback(clock));
}

function createAudio({ readyState = 4, paused = false } = {}) {
  const listeners = new Map();
  return {
    volume: 1,
    paused,
    ended: false,
    readyState,
    isConnected: true,
    dataset: {},
    loadCalls: 0,
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
      if (type === 'canplay' || type === 'loadeddata') this.readyState = 4;
      for (const callback of Array.from(listeners.get(type) || [])) callback({ type, target: this });
    },
    load() {
      this.loadCalls += 1;
    },
    play() {
      this.playCalls += 1;
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    }
  };
}

(async () => {
  const passive = createAudio({ readyState: 0, paused: true });
  const passiveReady = service.waitForMediaReady(passive, 300, { load: false });
  assert.strictEqual(passive.loadCalls, 0, 'non-destructive readiness wait called load()');
  passive.dispatch('loadeddata');
  assert.strictEqual(await passiveReady, true, 'non-destructive readiness wait did not settle');

  const oldAudio = createAudio({ readyState: 4, paused: false });
  const nextAudio = createAudio({ readyState: 0, paused: true });
  const crossfade = service.crossfadePair(oldAudio, nextAudio, { ms: 100, readyTimeoutMs: 300, userGesture: true });
  assert.strictEqual(nextAudio.playCalls, 1, 'user-gesture crossfade must issue play() immediately');
  assert.strictEqual(nextAudio.loadCalls, 0, 'readiness wait interrupted the immediate user-gesture play() with load()');
  nextAudio.dispatch('canplay');
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(frames.size, 2, 'crossfade did not schedule both volume transitions');
  flushFrames(100);
  assert.strictEqual(await crossfade, true, 'user-gesture crossfade did not complete');
  assert.strictEqual(oldAudio.pauseCalls, 1, 'completed crossfade did not pause the previous source');
  assert.strictEqual(nextAudio.paused, false, 'completed crossfade left the next source paused');

  console.log('PASS v1.6.53 user-gesture crossfade readiness and resolved-false Dock settlement');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
