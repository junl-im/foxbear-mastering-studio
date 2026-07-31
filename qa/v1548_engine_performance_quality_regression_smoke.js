#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function loadFinalizerContext() {
  const sandbox = {
    console, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array,
    ArrayBuffer, DataView, Math, Number, String, Boolean, Array, Object, Map, Set,
    JSON, Date, isFinite, parseFloat, parseInt, self: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(read('src/workers/master-finalizer.worker.js'), sandbox, { filename: 'master-finalizer.worker.js' });
  return sandbox;
}

function runFinalizer(context, { sampleRate = 44100, duration = 0.45, channels = 2, kind = 'normal', analysis = {} } = {}) {
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const channelData = Array.from({ length: channels }, () => new Float32Array(length));
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    let base = 0.18 * Math.sin(2 * Math.PI * 120 * t) + 0.07 * Math.sin(2 * Math.PI * 5200 * t);
    if (kind === 'stress' && i % Math.max(64, Math.floor(sampleRate * 0.09)) < 3) base += 1.2;
    for (let ch = 0; ch < channels; ch += 1) channelData[ch][i] = base * (ch ? 0.97 : 1);
  }
  const messages = [];
  context.self.postMessage = message => messages.push(message);
  context.self.onmessage({ data: {
    sampleRate, channels, length, targetLufs: -14, ceilingDb: -1,
    qualityMode: 'balanced', truePeak: true, analysis,
    channelBuffers: channelData.map(data => data.buffer)
  } });
  return messages.filter(message => !message?.__foxbearProgress).at(-1);
}

function makeAudioBuffer(channels, sampleRate = 44100) {
  const length = channels[0].length;
  return {
    length,
    sampleRate,
    numberOfChannels: channels.length,
    getChannelData(index) { return channels[index]; }
  };
}

function makeAuditPair() {
  const sampleRate = 44100;
  const length = sampleRate;
  const beforeL = new Float32Array(length);
  const beforeR = new Float32Array(length);
  const afterL = new Float32Array(length);
  const afterR = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const impulse = i % 4200 < 4 ? 0.72 : 0;
    const before = 0.16 * Math.sin(2 * Math.PI * 120 * t) + 0.09 * Math.sin(2 * Math.PI * 8200 * t) + impulse;
    const pumped = (0.10 + 0.07 * Math.max(0, Math.sin(2 * Math.PI * 7 * t))) * Math.sin(2 * Math.PI * 105 * t);
    beforeL[i] = before;
    beforeR[i] = before * 0.96;
    afterL[i] = pumped;
    afterR[i] = -pumped;
  }
  return {
    before: makeAudioBuffer([beforeL, beforeR], sampleRate),
    after: makeAudioBuffer([afterL, afterR], sampleRate)
  };
}

function loadQualityAudit() {
  const context = vm.createContext({ window: null, console, Math, Number, Object, Array });
  context.window = context;
  vm.runInContext(read('src/audio/mastering-quality-audit-service.js'), context, { filename: 'mastering-quality-audit-service.js' });
  return context.FoxBearMasteringQualityAudit;
}

function loadQualityGate() {
  const context = vm.createContext({ window: null, console, Math, Number, Object, Array, Date });
  context.window = context;
  vm.runInContext(read('src/audio/quality-gate-service.js'), context, { filename: 'quality-gate-service.js' });
  return context.FoxBearQualityGateService;
}

function loadRecommendationEngine() {
  const context = vm.createContext({ window: null, globalThis: null, console, Math, Number, Object, Array, Set, Map });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(read('src/config/genre-presets.js'), context, { filename: 'genre-presets.js' });
  vm.runInContext(read('src/recommendation/recommendation-engine.js'), context, { filename: 'recommendation-engine.js' });
  return vm.runInContext(`FoxBearRecommendationEngine.createRecommendationEngine({
    GENRE_PRESETS, PRESET_LABELS,
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value))),
    clamp01: value => Math.min(1, Math.max(0, Number(value) || 0)),
    estimateMobileSpeakerRisk: analysis => ({ risk: Math.min(1, Math.max(0, Number(analysis.mobileSpeakerRisk) || 0)) })
  })`, context);
}

const workerSource = read('src/workers/master-finalizer.worker.js');
assert(!workerSource.includes('new Float32Array(src.slice(0, length))'), 'finalizer still double-copies each input channel');
assert(workerSource.includes('const deque = new Int32Array(length);'), 'limiter lookahead queue is not fixed-width');
assert(!/for \(const data of buffers\) data\[i\] = \(data\[i\] \|\| 0\) \* gain;\s*for \(const data of buffers\)/.test(workerSource), 'limiter applies gain twice');
assert(workerSource.includes('if (desired <= gain) gain = desired;'), 'limiter steady overload hold condition regressed');

const finalizer = loadFinalizerContext();
const constant = new Float32Array(2048).fill(1);
const limiter = finalizer.applyLookaheadLimiter([constant], constant.length, 0.5, 1000, 'fast');
let maxDeviation = 0;
for (const value of constant) maxDeviation = Math.max(maxDeviation, Math.abs(value - 0.5));
assert(maxDeviation < 1e-6, `steady limiter modulation detected: ${maxDeviation}`);
assert(Math.abs(limiter.meanReductionDb + 6.0206) < 0.02, 'limiter mean reduction telemetry is incorrect');
assert.strictEqual(Math.round(limiter.activePct), 100, 'limiter active percentage is incorrect');

const normal = runFinalizer(finalizer, { analysis: { bassRatio: 0.22, brightness: 0.55, lowMonoScore: 96 } });
assert.strictEqual(normal.ok, true, `normal finalizer failed: ${normal.error || ''}`);
assert(Number.isFinite(normal.info.performance?.processingMs), 'processing time telemetry missing');
assert(Number.isFinite(normal.info.performance?.realtimeFactor), 'realtime factor telemetry missing');
assert(Object.values(normal.info.performance?.stageMs || {}).every(Number.isFinite), 'stage timing contains non-finite values');

const auditService = loadQualityAudit();
const neutral = makeAuditPair().before;
const neutralAudit = auditService.compare(neutral, neutral);
assert(neutralAudit && neutralAudit.flags.length === 0, 'unchanged audio produced a false quality regression');
assert(neutralAudit.before.samples <= auditService.MAX_SAMPLES, 'quality audit exceeded the bounded sample budget');
const pair = makeAuditPair();
const badAudit = auditService.compare(pair.before, pair.after);
for (const code of ['DYNAMIC_COLLAPSE', 'HIGH_LOSS', 'PHASE_RISK']) {
  assert(badAudit.flags.some(flag => flag.code === code), `${code} regression was not detected`);
}

const qualityGate = loadQualityGate();
const badGate = qualityGate.createReport({
  report: {
    target: { lufs: -14, ceilingDb: -1 },
    after: { approxLufs: -14, durationSec: 30, invalidSamples: 0, clippedSamples: 0, truePeakDbTP: -1, dcOffsetAvg: 0 },
    loudness: { shortTermAfter: { max: -13.5, min: -16, range: 2.5 } },
    qualityAudit: badAudit,
    finalizer: { limiterReductionDb: -7, limiterActivePct: 88 }
  },
  track: { analysis: { bassRatio: 0.48 } },
  finalizeInfo: { targetLufs: -14, ceilingDb: -1, loudnessAfter: -14, peakAfter: Math.pow(10, -1 / 20), limiterReductionDb: -7, limiterActivePct: 88 }
});
for (const label of ['과도한 리미팅', '고역 손실', '스테레오 위상', '리미터 지속 동작']) {
  const item = badGate.items.find(entry => entry.label === label);
  assert(item && item.status === 'fail', `${label} severe regression was not failed`);
}

const recommendation = loadRecommendationEngine();
const recommendationCases = [
  ['vocal_ballad.wav', { brightness: 0.42, stereoWidth: 0.28, crest: 3.5, metallicHint: 0.25, loudnessHint: -19, bassRatio: 0.18, lowMidRatio: 0.34, midRatio: 0.34, highRatio: 0.14, transientDensity: 0.18 }, new Set(['ballad', 'kballad', 'rnb', 'acoustic'])],
  ['808_low_punch.wav', { brightness: 0.38, stereoWidth: 0.25, crest: 8, metallicHint: 0.3, loudnessHint: -12, bassRatio: 0.43, lowMidRatio: 0.29, midRatio: 0.18, highRatio: 0.1, transientDensity: 0.75, spectrumBands: { sub: 0.18 } }, new Set(['trap', 'hiphop', 'drill', 'punch'])],
  ['dance_electronic.wav', { brightness: 0.72, stereoWidth: 0.58, crest: 5.8, metallicHint: 0.58, loudnessHint: -10, bassRatio: 0.28, lowMidRatio: 0.18, midRatio: 0.22, highRatio: 0.32, transientDensity: 0.7 }, new Set(['dance', 'edm', 'house', 'synthpop', 'kpop'])],
  ['spatial_wide.wav', { brightness: 0.5, stereoWidth: 0.76, crest: 4, metallicHint: 0.32, loudnessHint: -16, bassRatio: 0.2, lowMidRatio: 0.22, midRatio: 0.3, highRatio: 0.28, transientDensity: 0.25, spatialExcessRisk: 0.08 }, new Set(['spatial', 'cinematic'])]
];
for (const [name, analysis, allowed] of recommendationCases) {
  const result = recommendation.safeRecommendPreset(name, analysis, 'v1548');
  assert(allowed.has(result.preset), `${name} recommendation drifted to ${result.preset}`);
  assert(Number.isFinite(result.confidence) && result.confidence >= 28 && result.confidence <= 95, `${name} confidence is invalid`);
  assert(Array.isArray(result.alternatives) && result.alternatives.length >= 3, `${name} alternatives missing`);
}

const app = read('src/app.js');
assert(app.includes('limiterActivePct: Number(finalizeInfo?.limiterActivePct'), 'master report does not preserve limiter activity');
assert(app.includes('const qualityAudit = window.FoxBearMasteringQualityAudit?.compare?.'), 'bounded before/after audit is not wired into the master report');
assert(app.includes('track.performanceInfo.speedFactor'), 'mastering performance profile does not expose speed factor');
assert(app.includes('처리 속도 ${speedFactor.toFixed(2)}x'), 'performance UI still displays inverted realtime ratio');

const pkg = JSON.parse(read('package.json'));
assert(pkg.qaChecks.includes('node --check src/audio/mastering-quality-audit-service.js'), 'quality audit syntax check is not registered');
assert(pkg.qaChecks.includes('node qa/v1548_engine_performance_quality_regression_smoke.js'), 'v1.6.46 QA is not registered');

console.log(`PASS v1.5.48 engine performance/quality regression: limiter ${limiter.meanReductionDb.toFixed(2)} dB · audit ${badAudit.flags.map(flag => flag.code).join('/')} · gate ${badGate.status}`);
