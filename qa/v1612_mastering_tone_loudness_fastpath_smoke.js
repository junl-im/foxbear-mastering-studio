#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const workerPath = path.join(root, 'src/workers/master-finalizer.worker.js');
const appPath = path.join(root, 'src/app.js');
const loudnessServicePath = path.join(root, 'src/audio/loudness-measurement-service.js');
const workerSource = fs.readFileSync(workerPath, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');
const loudnessServiceSource = fs.readFileSync(loudnessServicePath, 'utf8');

assert(workerSource.includes('piano transient integrity and single-stage transparent limiting'), 'v1.6.110 finalizer ownership marker is missing');
assert(workerSource.includes('const limiterInfo = applyLookaheadLimiter(data, length, ceiling, sampleRate, qualityMode, analysis);'), 'analysis-aware final limiter ownership is missing');
assert(!workerSource.includes('applySoftCeiling(data'), 'legacy serial soft-ceiling stage must remain removed');
assert(workerSource.includes('function filterKWeightedPower('), 'K-weighted power fast path is missing');
assert(workerSource.includes('const filtered = Math.fround(processBiquad('), 'K-weighted Float32-equivalent rounding is missing');
assert(workerSource.includes('function inspectAndSanitizeInputSignal('), 'input inspection and sanitization are not fused');
assert(workerSource.includes('function removeDcOffsetAndSanitize('), 'final DC removal and sanitization are not fused');
assert((workerSource.match(/if \(buffers\.length === 1\)/g) || []).length >= 3, 'mono/stereo tone dynamics are not channel-specialized');
assert(!workerSource.includes('const scratch = buffers.map(() => ({'), 'worker tone dynamics still allocate per-channel scratch objects');
assert(appSource.includes('const finalLoudness = measureKWeightedLoudnessBundleAudioBuffer(working);'), 'fallback final loudness still performs duplicate K-weighting');
assert(appSource.includes('FoxBearLoudnessMeasurementService'), 'fallback loudness service bridge is missing');
assert(loudnessServiceSource.includes('function makePower(') && loudnessServiceSource.includes('Math.fround(processBiquad('), 'fallback K-weighted power fast path is missing');

function loadWorker() {
  const sandbox = {
    console, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array,
    ArrayBuffer, DataView, Math, Number, String, Boolean, Array, Object, Map, Set,
    JSON, Date, isFinite, parseFloat, parseInt, self: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(workerSource, sandbox, { filename: 'master-finalizer.worker.js' });
  return sandbox;
}

const worker = loadWorker();

function makeSignal(sampleRate, seconds, channels) {
  const length = Math.floor(sampleRate * seconds);
  return Array.from({ length: channels }, (_, ch) => {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const transient = i % Math.max(200, Math.round(sampleRate * 0.091)) < 2 ? 0.62 : 0;
      const value = 0.19 * Math.sin(2 * Math.PI * 97 * t)
        + 0.085 * Math.sin(2 * Math.PI * 3100 * t)
        + 0.035 * Math.sin(2 * Math.PI * 7800 * t)
        + transient;
      data[i] = value * (ch ? 0.96 : 1);
    }
    return data;
  });
}

for (const sampleRate of [32000, 44100, 48000]) {
  for (const channels of [1, 2]) {
    const input = makeSignal(sampleRate, 0.43, channels);
    const length = input[0].length;
    const filtered = worker.filterKWeightedBuffers(input, sampleRate, length, channels);
    const power = worker.filterKWeightedPower(input, sampleRate, length, channels);
    const oldIntegrated = worker.measureKWeightedGatedLoudnessFromFiltered(filtered, sampleRate, length, channels);
    const newIntegrated = worker.measureKWeightedGatedLoudnessFromPower(power, sampleRate, length);
    const oldShortTerm = worker.measureShortTermLufsStatsFromFiltered(filtered, sampleRate, length, channels);
    const newShortTerm = worker.measureShortTermLufsStatsFromPower(power, sampleRate, length);
    assert.strictEqual(newIntegrated, oldIntegrated, `${sampleRate}/${channels} integrated loudness changed`);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(newShortTerm)), JSON.parse(JSON.stringify(oldShortTerm)), `${sampleRate}/${channels} short-term loudness changed`);
  }
}

function referenceInspectAndSanitize(buffers, length, sampleRate) {
  const durationSec = length / Math.max(1, sampleRate);
  if (durationSec < 0.10) return { ok: false, code: 'MASTERING_INPUT_TOO_SHORT', message: '오디오가 0.10초보다 짧아 안정적으로 마스터링할 수 없습니다.', durationSec, peak: 0, rms: 0, invalidSamples: 0, sampledSamples: 0, invalidRatio: 0 };
  let peak = 0, sumSquares = 0, sampledSamples = 0, invalidSamples = 0;
  for (const data of buffers) {
    for (let i = 0; i < length; i += 1) {
      const value = Number(data[i]);
      sampledSamples += 1;
      if (!Number.isFinite(value)) { invalidSamples += 1; continue; }
      const absolute = Math.abs(value);
      if (absolute > peak) peak = absolute;
      sumSquares += value * value;
    }
  }
  const finiteSamples = Math.max(0, sampledSamples - invalidSamples);
  const invalidRatio = sampledSamples ? invalidSamples / sampledSamples : 1;
  const rms = finiteSamples ? Math.sqrt(sumSquares / finiteSamples) : 0;
  const metrics = { durationSec, peak, rms, invalidSamples, sampledSamples, invalidRatio };
  for (const data of buffers) {
    for (let i = 0; i < length; i += 1) {
      let value = data[i];
      if (!Number.isFinite(value)) value = 0;
      if (value > 8) value = 8;
      else if (value < -8) value = -8;
      data[i] = value;
    }
  }
  if (!finiteSamples || invalidRatio > 0.01) return { ok: false, code: 'MASTERING_INPUT_CORRUPT', message: '오디오 샘플에 비정상 값이 너무 많아 안전하게 마스터링할 수 없습니다.', ...metrics };
  if (peak < 0.0005 || rms < 0.00008) return { ok: false, code: 'MASTERING_INPUT_SILENT', message: '무음 또는 신호가 너무 작은 파일은 마스터링할 수 없습니다.', ...metrics };
  return { ok: true, code: 'MASTERING_INPUT_OK', message: '입력 신호 정상', ...metrics, nearSilent: peak < 0.002 || rms < 0.0002 };
}

const malformed = makeSignal(44100, 0.2, 2);
malformed[0][7] = 9.5;
malformed[1][17] = NaN;
const expectedBuffers = malformed.map(channel => channel.slice());
const actualBuffers = malformed.map(channel => channel.slice());
const expectedHealth = referenceInspectAndSanitize(expectedBuffers, expectedBuffers[0].length, 44100);
const actualHealth = worker.inspectAndSanitizeInputSignal(actualBuffers, actualBuffers[0].length, 44100);
assert.deepStrictEqual(JSON.parse(JSON.stringify(actualHealth)), JSON.parse(JSON.stringify(expectedHealth)), 'fused input health result changed');
for (let ch = 0; ch < actualBuffers.length; ch += 1) {
  for (let i = 0; i < actualBuffers[ch].length; i += 1) {
    assert(Object.is(actualBuffers[ch][i], expectedBuffers[ch][i]), `fused sanitizer changed sample ${ch}:${i}`);
  }
}

let result = null;
worker.self.postMessage = message => { if (!message?.__foxbearProgress) result = message; };
const input = makeSignal(44100, 0.28, 2);
worker.self.onmessage({ data: {
  __foxbearJobId: 'v1612-tone-loudness-fastpath',
  sampleRate: 44100,
  channels: 2,
  length: input[0].length,
  targetLufs: -14,
  ceilingDb: -1,
  qualityMode: 'balanced',
  truePeak: true,
  analysis: {
    bassRatio: 0.46, lowMidRatio: 0.40, midRatio: 0.31, presenceRatio: 0.30,
    highRatio: 0.39, airRatio: 0.19, brightness: 0.70, metallicHint: 0.66,
    transientDensity: 0.68, lowMonoScore: 68, spatialExcessRisk: 0.36,
    mobileSpeakerRisk: 0.62, mobileSpeakerDetail: { boom: 0.55, box: 0.66, harsh: 0.64 },
    dynamicDeEsserRisk: 0.72, vocalMetallicRisk: 0.78, targetDynamicFreq: 6500
  },
  channelBuffers: input.map(channel => channel.buffer)
} });
assert(result?.ok, `optimized finalizer failed: ${result?.error || 'unknown error'}`);
assert(Number.isFinite(result.info?.performance?.stageMs?.toneDynamics), 'tone-dynamics timing is missing');
assert(Number.isFinite(result.info?.performance?.stageMs?.finalMeasurement), 'final-measurement timing is missing');
assert(result.info.peakAfter <= Math.pow(10, -1 / 20) * 1.012, 'v1.6.110 output exceeded ceiling tolerance');

console.log('PASS v1.6.12 mastering tone/loudness fast path: exact K-weighted metrics · fused safety scans · channel-specialized dynamics · fallback measurement reuse');
