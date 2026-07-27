#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const workerPath = path.join(root, 'src/workers/master-finalizer.worker.js');
const source = fs.readFileSync(workerPath, 'utf8');

assert(source.includes('src.length === length ? src : src.slice(0, length)'), 'transferred exact-length buffers are still copied');
assert(source.includes('const preLimiterPeak = peakBefore * Math.abs(gain);'), 'pre-limiter peak still performs a duplicate full scan');
assert(source.includes('const finalLoudness = measureKWeightedLoudnessBundle('), 'final loudness does not share one K-weighted pass');
assert(source.includes('const finalPeak = peakAfter;'), 'final peak still performs a duplicate true-peak scan');
assert.strictEqual((source.match(/const finalLoudness = measureKWeightedLoudnessBundle\(/g) || []).length, 1, 'final loudness bundle wiring is duplicated');

function loadWorker() {
  const sandbox = {
    console, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array,
    ArrayBuffer, DataView, Math, Number, String, Boolean, Array, Object, Map, Set,
    JSON, Date, isFinite, parseFloat, parseInt, self: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'master-finalizer.worker.js' });
  return sandbox;
}

const worker = loadWorker();
const sampleRate = 44100;
const length = Math.floor(sampleRate * 0.42);
const input = [new Float32Array(length), new Float32Array(length)];
for (let i = 0; i < length; i += 1) {
  const t = i / sampleRate;
  const value = 0.19 * Math.sin(2 * Math.PI * 97 * t)
    + 0.08 * Math.sin(2 * Math.PI * 2800 * t)
    + (i % 5100 < 2 ? 0.72 : 0);
  input[0][i] = value;
  input[1][i] = value * 0.97;
}

const separateIntegrated = worker.measureKWeightedGatedLoudness(input, sampleRate, length, 2);
const separateShortTerm = worker.measureShortTermLufsStatsBuffers(input, sampleRate, length, 2);
const bundled = worker.measureKWeightedLoudnessBundle(input, sampleRate, length, 2);
assert.strictEqual(bundled.integrated, separateIntegrated, 'shared K-weighted pass changed integrated loudness');
assert.deepStrictEqual(JSON.parse(JSON.stringify(bundled.shortTerm)), JSON.parse(JSON.stringify(separateShortTerm)), 'shared K-weighted pass changed short-term loudness');

const transferredBuffers = input.map(channel => channel.slice().buffer);
let result = null;
worker.self.postMessage = message => {
  if (!message?.__foxbearProgress) result = message;
};
worker.self.onmessage({ data: {
  __foxbearJobId: 'v1611-speed-reuse',
  sampleRate,
  channels: 2,
  length,
  targetLufs: -14,
  ceilingDb: -1,
  qualityMode: 'balanced',
  truePeak: true,
  analysis: { bassRatio: 0.28, brightness: 0.52, lowMonoScore: 94 },
  channelBuffers: transferredBuffers
} });

assert(result?.ok, `optimized finalizer failed: ${result?.error || 'unknown error'}`);
assert.strictEqual(result.channelBuffers[0], transferredBuffers[0], 'left transferred buffer was not reused in place');
assert.strictEqual(result.channelBuffers[1], transferredBuffers[1], 'right transferred buffer was not reused in place');
assert(Number.isFinite(result.info?.loudnessAfter), 'final loudness telemetry is invalid');
assert(Number.isFinite(result.info?.peakAfter), 'final peak telemetry is invalid');
assert(Number.isFinite(result.info?.performance?.realtimeFactor), 'speed telemetry is invalid');
assert(result.info.peakAfter <= Math.pow(10, -1 / 20) * 1.012, 'optimized finalizer exceeded the true-peak ceiling');

console.log(`PASS v1.6.11 mastering speed reuse: zero-copy channels · shared K-weighted pass · duplicate true-peak scans removed · ${result.info.performance.realtimeFactor.toFixed(2)}x synthetic realtime`);
