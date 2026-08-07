'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function loadSafety(ua, deviceMemory = 4) {
  const sandbox = {
    navigator: { userAgent: ua, deviceMemory, hardwareConcurrency: 4 },
    matchMedia: () => ({ matches: true }),
    console
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('src/audio/inapp-mastering-safety-service.js'), sandbox);
  return sandbox.FoxBearInAppMasteringSafetyService;
}

const safety = loadSafety('Mozilla/5.0 Linux Android 14 KAKAOTALK', 4);
const sampleRate = 48000;
const durationSec = 360;
const buffer = {
  numberOfChannels: 2,
  length: sampleRate * durationSec,
  sampleRate,
  duration: durationSec
};
const plan = safety.createPlan(buffer, {
  qualityMode: 'max',
  outputFormat: 'mp3-320',
  transformed: false,
  instrumentLayer: false,
  qualityRecoveryEnabled: true
});
assert.strictEqual(plan.kakao, true, 'Kakao runtime must be detected');
assert.strictEqual(plan.highRisk, true, 'six-minute Kakao render must enter memory safety path');
assert.strictEqual(plan.qualityMode, 'fast', 'critical Kakao pressure must force fast finalizer mode');
assert.strictEqual(plan.disableTruePeak, true, 'critical Kakao pressure must disable high-cost true peak pass');
assert.strictEqual(plan.preserveFirstRenderOnNonCriticalFailure, true, 'Kakao safety must preserve a valid first render');
assert.strictEqual(safety.shouldPreserveFirstRender(plan, {
  status: 'fail',
  riskFlags: [{ status: 'fail', code: 'DYNAMIC_COLLAPSE', label: 'Limiter 과보정' }]
}), true, 'non-critical quality failure should preserve the first render');
assert.strictEqual(safety.shouldPreserveFirstRender(plan, {
  status: 'fail',
  riskFlags: [{ status: 'fail', code: 'INVALID_OUTPUT', label: '출력 샘플 무결성' }]
}), false, 'invalid output must never bypass recovery');
assert.strictEqual(safety.shouldPreserveFirstRender(plan, {
  status: 'fail',
  items: [{ status: 'fail', label: '클리핑 샘플', detail: '20개' }]
}), false, 'clipped output must never bypass recovery');

const decodeSource = read('src/audio/audio-decode-service.js');
const compatBody = decodeSource.slice(
  decodeSource.indexOf('function decodeAudioDataCompat'),
  decodeSource.indexOf('async function verifyMediaElementCanLoad')
);
assert(!compatBody.includes('.slice('), 'decode compatibility path must not clone the compressed file');
assert(compatBody.includes('decodeAudioData(arrayBuffer, onSuccess, onFailure)'), 'decode must use one callback-compatible invocation');
assert(decodeSource.includes('FOXBEAR_WEB_AUDIO_DECODE_REJECTED'), 'media-playable Web Audio rejection must carry a distinct code');
assert(decodeSource.includes('파일 손상으로 단정할 수 없습니다'), 'decode error must not falsely blame a playable source file');

const appSource = read('src/app.js');
const safetySource = read('src/audio/inapp-mastering-safety-service.js');
assert(appSource.includes('currentSourceBuffer = null;'), 'source PCM reference must be released after preparation');
assert(appSource.includes("status: 'preserved-first-render-device-safety'"), 'device-safe quality recovery deferral is missing');
assert(safetySource.includes('카카오 브라우저의 처리 메모리 제한'), 'Kakao memory error copy is missing');
assert(!/\/decode\|decoding\|unsupported\|not supported\|audio\//.test(safetySource), 'generic audio token must not classify every AudioContext error as source corruption');

const html404 = read('404.html');
const routeRecovery = read('src/boot/route-recovery.js');
assert(html404.includes('src/boot/route-recovery.js') && routeRecovery.includes('음원 오류가 아니라 WebView 메모리 또는 경로 복구일 수 있습니다'), 'Kakao route recovery must explain that the source file may be valid');

console.log('PASS v1.5.58 Kakao mastering runtime recovery smoke');
