#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('src/app.js', 'utf8');
const transitionSource = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');
const lifecycleSource = fs.readFileSync('src/audio/playback-lifecycle-recovery-service.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.strictEqual(pkg.version, '1.6.72');
assert(pkg.qaChecks.includes('node --check src/audio/playback-lifecycle-recovery-service.js'));
assert(pkg.qaChecks.includes('node qa/v1655_mobile_playback_focus_resume_smoke.js'));
assert(transitionSource.includes('function reconcileExternalPause(audio, reason = \'external-pause\')'));
assert(transitionSource.includes('async function resumeAfterInterruption(audio, options = {})'));
assert(lifecycleSource.includes("collapseInterruptedCrossfade('lifecycle-return-crossfade')"));
assert(lifecycleSource.includes("showToast('브라우저가 자동 재생 복구를 막았습니다. Dock 재생 버튼을 눌러주세요.')"));
assert(app.includes("handleUnexpectedPause?.(audio, 'dock-visible-native-pause')"));
assert(index.includes('src/audio/playback-lifecycle-recovery-service.js?v=1.6.72-ci-safe-hygiene-self-repair'));
assert(sw.includes("'./src/audio/playback-lifecycle-recovery-service.js?v=1.6.72-ci-safe-hygiene-self-repair'"));
assert(app.split(/\r?\n/).length < 13300, 'app line budget should remain intact');

const fakeDocument = { visibilityState: 'visible' };
const fakeWindow = {
  document: fakeDocument,
  navigator: { userAgent: 'KAKAOTALK' },
  performance: { now: () => Date.now() },
  setTimeout,
  clearTimeout,
  requestAnimationFrame: callback => setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: clearTimeout
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
vm.runInNewContext(lifecycleSource, context);

const transition = fakeWindow.FoxBearPlaybackTransitionService;
const lifecycle = fakeWindow.FoxBearPlaybackLifecycleRecoveryService;

function createAudio({ rejectPlay = false } = {}) {
  return {
    volume: 1,
    paused: true,
    ended: false,
    readyState: 4,
    isConnected: true,
    currentTime: 12,
    duration: 180,
    dataset: {},
    playCalls: 0,
    pauseCalls: 0,
    addEventListener() {},
    removeEventListener() {},
    load() {},
    play() {
      this.playCalls += 1;
      if (rejectPlay) {
        const error = new Error('autoplay blocked');
        error.name = 'NotAllowedError';
        return Promise.reject(error);
      }
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    }
  };
}

function waitForAsync() {
  return new Promise(resolve => setTimeout(resolve, 10));
}

function createLifecycleHarness(audio) {
  const state = {
    bottomPreviewMode: 'mastered',
    bottomPreviewTransport: {
      trackId: 'track-1',
      mode: 'mastered',
      playing: true,
      capturedAt: Date.now(),
      expiresAt: Date.now() + 60000
    }
  };
  const mobile = {};
  const syncStates = [];
  const notices = [];
  const root = {
    dataset: {},
    children: [],
    classList: { contains() { return false; }, remove() {} },
    querySelectorAll() { return []; }
  };
  const controller = lifecycle.createController({
    document: fakeDocument,
    getState: () => state,
    getMobileState: () => mobile,
    getSelectedTrack: () => ({ id: 'track-1' }),
    getActiveAudio: () => audio,
    getPlayerRoot: () => root,
    captureTransport: () => state.bottomPreviewTransport,
    renderDock() {},
    scheduleLayout() {},
    syncWakeLock() {},
    syncMediaSession() {},
    syncPlayButton: (_audio, playing) => syncStates.push(Boolean(playing)),
    unregisterAudio() {},
    showToast: message => notices.push(message),
    getTransitionService: () => transition
  });
  return { controller, state, mobile, syncStates, notices };
}

(async () => {
  const recoveredAudio = createAudio();
  transition.setPlaybackIntent(recoveredAudio, true, 'before-background');
  const recovered = createLifecycleHarness(recoveredAudio);
  assert.strictEqual(recovered.controller.restore(true), true);
  await waitForAsync();
  assert.strictEqual(recoveredAudio.playCalls, 1, 'lifecycle return did not attempt playback recovery');
  assert.strictEqual(recoveredAudio.paused, false, 'successful lifecycle recovery left the audio paused');
  assert.strictEqual(transition.isPlaybackIntended(recoveredAudio), true);
  assert(recovered.syncStates.includes(true), 'successful lifecycle recovery did not synchronize the play button');

  const blockedAudio = createAudio({ rejectPlay: true });
  transition.setPlaybackIntent(blockedAudio, true, 'before-background');
  const blocked = createLifecycleHarness(blockedAudio);
  assert.strictEqual(blocked.controller.restore(true), true);
  await waitForAsync();
  assert.strictEqual(blockedAudio.playCalls, 1, 'blocked lifecycle recovery did not attempt play()');
  assert.strictEqual(transition.isPlaybackIntended(blockedAudio), false, 'blocked auto-resume left a stale playing intent');
  assert.strictEqual(blocked.state.bottomPreviewTransport.playing, false, 'blocked auto-resume left transport marked as playing');
  assert(blocked.syncStates.includes(false), 'blocked auto-resume did not restore a tappable paused UI');
  assert(blocked.notices.some(message => message.includes('Dock 재생 버튼')), 'blocked auto-resume did not provide recovery guidance');

  const focusAudio = createAudio();
  transition.setPlaybackIntent(focusAudio, true, 'playing-before-route-change');
  const focus = createLifecycleHarness(focusAudio);
  fakeDocument.visibilityState = 'visible';
  assert.strictEqual(focus.controller.handleUnexpectedPause(focusAudio, 'headset-route-change'), true);
  assert.strictEqual(transition.isPlaybackIntended(focusAudio), false, 'visible external pause left stale play intent');

  transition.setPlaybackIntent(focusAudio, true, 'background-focus-loss');
  fakeDocument.visibilityState = 'hidden';
  assert.strictEqual(focus.controller.handleUnexpectedPause(focusAudio, 'background-focus-loss'), false);
  assert.strictEqual(transition.isPlaybackIntended(focusAudio), true, 'hidden focus loss should preserve resume intent');
  fakeDocument.visibilityState = 'visible';

  console.log('PASS v1.6.55 mobile focus resume reconciliation and stale intent recovery');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
