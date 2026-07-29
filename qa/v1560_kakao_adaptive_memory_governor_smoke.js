'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function loadSafety() {
  const sandbox = {
    navigator: { userAgent: 'Mozilla/5.0 Linux Android 14 KAKAOTALK', deviceMemory: 4, hardwareConcurrency: 4 },
    matchMedia: () => ({ matches: true }),
    console
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('src/audio/inapp-mastering-safety-service.js'), sandbox);
  return sandbox.FoxBearInAppMasteringSafetyService;
}

const safety = loadSafety();
const preflight = safety.createPlan(null, {
  durationSec: 360,
  sampleRate: 48000,
  channels: 2,
  qualityMode: 'max',
  outputFormat: 'mp3-320',
  qualityRecoveryEnabled: true
});
assert(preflight.pcmMb > 100, 'preflight must estimate PCM without decoding');
assert(['high', 'critical'].includes(preflight.pressureLevel), 'Kakao preflight must classify memory pressure');
assert(preflight.warning && preflight.warning.message.includes('메모리'), 'preflight warning copy missing');
assert.strictEqual(preflight.qualityMode, 'fast', 'high-risk Kakao preflight must force fast mode');
assert.strictEqual(preflight.disableTruePeak, true, 'high-risk Kakao preflight must disable high-cost true peak');
assert.strictEqual(preflight.recommendedOutputFormat, 'wav24', 'critical MP3 plan must recommend WAV 24bit');

const memorySandbox = {
  console,
  Blob,
  Date,
  Math,
  performance: {
    now: () => 1000,
    memory: {
      usedJSHeapSize: 170 * 1024 * 1024,
      totalJSHeapSize: 180 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024
    }
  },
  FoxBearBuildInfo: { assetVersion: '1.6.37-kakao-adaptive-memory-governor' }
};
memorySandbox.window = memorySandbox;
memorySandbox.globalThis = memorySandbox;
vm.createContext(memorySandbox);
vm.runInContext(read('src/audio/mastering-memory-diagnostics-service.js'), memorySandbox);
const memory = memorySandbox.FoxBearMasteringMemoryDiagnostics;
const track = {
  performanceInfo: memory.createPerformanceInfo(),
  inAppSafetyInfo: {
    restricted: true,
    kakao: true,
    sourceQualityMode: 'max',
    projectedPeakMb: 120,
    memoryBudgetMb: 180,
    pressureRatio: 0.67,
    label: '카카오톡 인앱 브라우저'
  }
};
const audio = { numberOfChannels: 2, length: 48000 * 180 };
const sample = memory.capture(track, '마스터 체인', { prepared: audio, mastered: audio }, { elapsedMs: 1000 });
const decision = memory.createGovernorDecision(track, sample, {
  sourceQualityMode: 'max',
  requestedTruePeak: true,
  outputFormat: 'mp3-320'
});
assert(['high', 'critical'].includes(decision.level), 'observed memory must escalate the governor');
assert.strictEqual(decision.qualityMode, 'fast', 'restricted high pressure must select fast mode');
assert.strictEqual(decision.truePeak, false, 'restricted high pressure must use lightweight peak processing');
assert.strictEqual(decision.compactWaveform, true, 'high pressure must compact waveform work');
assert.strictEqual(track.memoryGovernorInfo, decision, 'decision must be attached to the track');
assert(track.performanceInfo.memoryGovernorHistory.length >= 1, 'governor history must be recorded');

const app = read('src/app.js');
assert(app.includes("stage: '사전 진단'"), 'mastering preflight governor is missing');
assert(app.indexOf("stage: '사전 진단'") < app.indexOf('currentSourceBuffer = await decodeAudio(track.file'), 'preflight must run before mastering decode');
assert(app.includes('canReleasePreparedBeforeRecovery'), 'post-encode PCM release policy is missing');
assert(app.includes("markPerformanceStage(track, 'PCM 조기 해제'"), 'PCM release stage diagnostics are missing');
assert(app.includes('track.memoryGovernorInfo?.compactWaveform'), 'compact waveform path is missing');
assert(app.includes('memoryGovernor?.truePeak !== false'), 'finalizer must honor the runtime memory governor');

const diagnostics = read('src/boot/performance-diagnostics.js');
assert(diagnostics.includes('memory governor:'), 'performance panel must expose memory governor state');

console.log('PASS v1.5.60 Kakao adaptive memory governor smoke');
