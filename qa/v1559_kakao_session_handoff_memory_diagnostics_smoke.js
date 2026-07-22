'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function createSandbox(url = 'https://example.test/index.html?foxbearExternal=1') {
  const historyCalls = [];
  const sandbox = {
    console,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Blob,
    Date,
    Math,
    performance: {
      memory: {
        usedJSHeapSize: 80 * 1024 * 1024,
        totalJSHeapSize: 120 * 1024 * 1024,
        jsHeapSizeLimit: 512 * 1024 * 1024
      }
    },
    location: { href: url },
    history: { state: null, replaceState: (...args) => historyCalls.push(args) },
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    FoxBearBuildInfo: { assetVersion: '1.5.74-bulk-pause-skip-reorder-mobile-download' }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.historyCalls = historyCalls;
  vm.createContext(sandbox);
  return sandbox;
}

const source = read('src/boot/session-handoff-service.js');
const sourceSandbox = createSandbox();
vm.runInContext(source, sourceSandbox);
const handoff = sourceSandbox.FoxBearSessionHandoff;

handoff.registerProvider(() => ({
  global: {
    outputFormat: 'wav24', targetLufs: -14, ceilingDb: -1,
    qualityMode: 'fast', performanceMode: 'mobile', masterGoal: 'natural',
    masterStyle: 'streaming', masterStrength: 'mobile_safe', platformPreset: 'streaming',
    adaptiveTargetLufs: true, referenceMatchStrength: 0.72,
    featureFlags: { truePeakGuard: false, phaseSafe: true }
  },
  track: {
    preset: 'kpop', genreLocked: true,
    settings: { clarity: 61, warmth: 52, width: 46, stereoGroove: 11, analogGroove: 4, dynamicPunch: 40, metallicRemoval: 49, intensity: 108 },
    transform: { pitchSemitones: 2, speedRatio: 0.95, snapSemitone: true, beatPreset: 'slow5' },
    instrument: { mode: 'kick_hat', amount: 'light' }
  }
}));

const url = handoff.attachToUrl('https://example.test/index.html?foxbearExternal=1', { reason: 'kakao-runtime-recovery' });
const token = new URL(url).searchParams.get('foxbearHandoff');
assert(token && token.length < 7200, 'handoff token must be bounded');
assert(!url.includes('song') && !url.includes('filename'), 'handoff URL must not contain file identity');
const decoded = handoff.decodePayload(token);
assert.strictEqual(decoded.track.preset, 'kpop');
assert.strictEqual(decoded.global.performanceMode, 'mobile');
assert.strictEqual(decoded.track.settings.intensity, 108);
assert.strictEqual(decoded.reason, 'kakao-runtime-recovery');

const targetSandbox = createSandbox(url);
vm.runInContext(source, targetSandbox);
const target = targetSandbox.FoxBearSessionHandoff;
const consumed = target.consumeFromLocation();
assert(consumed, 'external browser must consume the handoff token');
const state = { featureFlags: {} };
assert.strictEqual(target.applyGlobalState(state, consumed), true);
assert.strictEqual(state.outputFormat, 'wav24');
assert.strictEqual(state.performanceMode, 'mobile');
assert.strictEqual(state.featureFlags.truePeakGuard, false);
const profile = target.takePendingTrackProfile();
const track = {};
assert.strictEqual(target.applyTrackProfile(track, profile), true);
assert.strictEqual(track.preset, 'kpop');
assert.strictEqual(track.transform.beatPreset, 'slow5');
assert.strictEqual(target.peekPendingTrackProfile(), null, 'track profile must be one-shot');
assert(targetSandbox.historyCalls.length >= 1, 'consumed token must be removed from the address bar');

const memorySandbox = createSandbox();
vm.runInContext(read('src/audio/mastering-memory-diagnostics-service.js'), memorySandbox);
const memory = memorySandbox.FoxBearMasteringMemoryDiagnostics;
const performanceInfo = { memoryStages: [] };
const memoryTrack = {
  performanceInfo,
  inAppSafetyInfo: { projectedPeakMb: 220, memoryBudgetMb: 180, pressureRatio: 1.22, label: '카카오톡 인앱 브라우저' }
};
const audioA = { numberOfChannels: 2, length: 48000 * 120 };
const audioB = { numberOfChannels: 2, length: 48000 * 120 };
memory.capture(memoryTrack, '디코딩', { decoded: audioA }, { elapsedMs: 500 });
memory.capture(memoryTrack, '마스터 체인', { prepared: audioA, mastered: audioB }, { elapsedMs: 1500 });
const summary = memory.summarize(performanceInfo);
assert.strictEqual(summary.samples.length, 2);
assert.strictEqual(summary.peakStage, '마스터 체인');
assert(summary.peakKnownBufferMB > 80, 'known PCM peak must include simultaneous buffers');
assert.strictEqual(summary.pressureRatio, 1.22);

const app = read('src/app.js');
const download = read('src/download/download-service.js');
const index = read('index.html');
assert(app.includes("runInitStep('외부 브라우저 작업 복구', initExternalBrowserHandoff)"));
assert(app.includes("actions.append(makeMiniButton('외부 브라우저 복구'"));
assert(app.includes('FoxBearMasteringMemoryDiagnostics?.markStage'));
assert(read('src/audio/mastering-memory-diagnostics-service.js').includes('function capture('));
assert(download.includes('FoxBearSessionHandoff?.attachToUrl'));
assert(index.includes('id="performanceDiagnosticsOpen"'));
assert(index.includes('src/boot/session-handoff-service.js'));
assert(index.includes('src/audio/mastering-memory-diagnostics-service.js'));

console.log('PASS v1.5.59 Kakao session handoff and memory diagnostics smoke');
