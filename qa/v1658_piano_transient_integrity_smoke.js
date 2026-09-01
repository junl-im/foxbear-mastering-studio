#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const workerCode = fs.readFileSync(path.join(root, 'src/workers/master-finalizer.worker.js'), 'utf8');
const auditCode = fs.readFileSync(path.join(root, 'src/audio/mastering-quality-audit-service.js'), 'utf8');
const gateCode = fs.readFileSync(path.join(root, 'src/audio/quality-gate-service.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.7.4-reload-reentry-mode-chooser'"), 'shared DSP version not updated');
assert(app.includes('function estimateMelodicTransientGlassRisk('), 'melodic transient glass-risk estimator missing');
assert(app.includes('melodicGlassRisk > 0.46'), 'exciter piano/glass bypass missing');
assert(app.includes('Worker finalizer owns lookahead/True-Peak limiting'), 'single limiter ownership contract missing');
assert(app.includes('if (Number(intensity.raw || 100) < 180) return input;'), 'normal mastering must bypass pre-finalizer limiter');
assert(app.includes('The finalizer owns LUFS normalization'), 'pre-finalizer gain staging contract missing');
assert(!workerCode.includes('applySoftCeiling(data, length, ceiling);'), 'worker still waveshapes every near-ceiling transient');
assert(!app.includes('data[i] = softCeilingSample(data[i], ceiling);'), 'fallback still waveshapes every near-ceiling transient');
assert(auditCode.includes("code: 'HIGH_GLARE'"), 'high-glare quality audit flag missing');
assert(gateCode.includes("HIGH_GLARE: '고역 찢어짐/유리질'"), 'high-glare quality gate label missing');

function loadWorker(code, filename) {
  const sandbox = {
    console,
    Float32Array,
    Float64Array,
    Int32Array,
    Int16Array,
    Uint8Array,
    ArrayBuffer,
    DataView,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    JSON,
    Date,
    isFinite,
    parseFloat,
    parseInt,
    self: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename });
  return payload => {
    let posted = null;
    sandbox.self.postMessage = message => {
      if (!message?.__foxbearProgress) posted = message;
    };
    sandbox.self.onmessage({ data: payload });
    if (!posted) throw new Error(`${filename} did not post a final response`);
    return posted;
  };
}

const runFinalizer = loadWorker(workerCode, 'src/workers/master-finalizer.worker.js');
const sampleRate = 44100;
const duration = 2.6;
const length = Math.floor(sampleRate * duration);

function seededNoise(index) {
  let x = (index + 1) * 1103515245 + 12345;
  x ^= x >>> 11;
  x ^= x << 7;
  return ((x >>> 0) / 0xffffffff) * 2 - 1;
}

function makePianoLikeStereo() {
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const events = [
    { at: 0.06, f: 261.63, amp: 0.22, pan: -0.18 },
    { at: 0.48, f: 329.63, amp: 0.20, pan: 0.12 },
    { at: 0.90, f: 392.00, amp: 0.21, pan: -0.08 },
    { at: 1.32, f: 523.25, amp: 0.19, pan: 0.16 },
    { at: 1.74, f: 659.25, amp: 0.18, pan: -0.12 },
    { at: 2.16, f: 783.99, amp: 0.16, pan: 0.10 }
  ];
  for (const event of events) {
    const start = Math.floor(event.at * sampleRate);
    const maxSamples = Math.min(length - start, Math.floor(0.64 * sampleRate));
    for (let n = 0; n < maxSamples; n += 1) {
      const t = n / sampleRate;
      const attack = Math.min(1, t / 0.0025);
      const decay = Math.exp(-t * 4.8);
      const hammer = Math.exp(-t * 68);
      let value = 0;
      for (let h = 1; h <= 9; h += 1) {
        const inharmonic = 1 + 0.00033 * h * h;
        const harmonicAmp = event.amp * Math.pow(h, -1.17) * (h >= 5 ? 0.72 : 1);
        value += Math.sin(2 * Math.PI * event.f * h * inharmonic * t + h * 0.09) * harmonicAmp;
      }
      value = value * attack * decay + seededNoise(start + n) * event.amp * 0.055 * hammer;
      const leftGain = 0.88 - event.pan * 0.28;
      const rightGain = 0.88 + event.pan * 0.28;
      left[start + n] += value * leftGain;
      right[start + n] += value * rightGain;
    }
  }
  return [left, right];
}

function samplePeak(buffers) {
  let peak = 0;
  for (const data of buffers) for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i] || 0));
  return peak;
}

function rmsRange(buffers, startSec, endSec) {
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  const end = Math.min(length, Math.floor(endSec * sampleRate));
  let sum = 0;
  let count = 0;
  for (const data of buffers) {
    for (let i = start; i < end; i += 1) {
      const x = data[i] || 0;
      sum += x * x;
      count += 1;
    }
  }
  return Math.sqrt(sum / Math.max(1, count));
}

function highDifferenceProxy(buffers) {
  let diff = 0;
  let base = 0;
  let count = 0;
  for (const data of buffers) {
    let previous = data[0] || 0;
    for (let i = 1; i < data.length; i += 1) {
      const x = data[i] || 0;
      const d = x - previous;
      diff += d * d;
      base += x * x;
      previous = x;
      count += 1;
    }
  }
  return Math.sqrt(diff / Math.max(1, count)) / Math.max(1e-9, Math.sqrt(base / Math.max(1, count)));
}

function ratioDb(after, before) {
  return 20 * Math.log10(Math.max(1e-9, after) / Math.max(1e-9, before));
}

const input = makePianoLikeStereo();
const inputForWorker = input.map(channel => channel.slice());
const result = runFinalizer({
  sampleRate,
  channels: 2,
  length,
  targetLufs: -14,
  ceilingDb: -1.0,
  qualityMode: 'balanced',
  truePeak: true,
  analysis: {
    bassRatio: 0.18,
    lowMidRatio: 0.24,
    midRatio: 0.35,
    highRatio: 0.32,
    presenceRatio: 0.23,
    airRatio: 0.13,
    brightness: 0.64,
    metallicHint: 0.58,
    transientDensity: 0.72,
    spatialExcessRisk: 0.08,
    lowMonoScore: 92,
    mobileSpeakerRisk: 0.20,
    harshPeakHz: 6100,
    targetDynamicFreq: 6100,
    melodicTransientGlassRisk: 0.78
  },
  channelBuffers: inputForWorker.map(channel => channel.buffer)
});

assert(result.ok, `piano finalizer failed: ${result.error || 'unknown'}`);
const output = result.channelBuffers.map(buffer => new Float32Array(buffer));
for (const data of output) {
  for (let i = 0; i < data.length; i += 1) assert(Number.isFinite(data[i]), `non-finite piano output at ${i}`);
}
const ceiling = Math.pow(10, -1 / 20);
assert(samplePeak(output) <= ceiling * 1.012, `piano output exceeds ceiling: ${samplePeak(output)}`);
assert(Number(result.info?.melodicTransientGlassRisk) === 0.78, 'piano/glass risk telemetry was not preserved');

const attackWindows = [0.06, 0.48, 0.90, 1.32, 1.74, 2.16];
const transientDeltas = [];
for (const at of attackWindows) {
  const inAttack = rmsRange(input, at, at + 0.018);
  const inBody = rmsRange(input, at + 0.075, at + 0.165);
  const outAttack = rmsRange(output, at, at + 0.018);
  const outBody = rmsRange(output, at + 0.075, at + 0.165);
  const beforeRatio = inAttack / Math.max(1e-9, inBody);
  const afterRatio = outAttack / Math.max(1e-9, outBody);
  transientDeltas.push(ratioDb(afterRatio, beforeRatio));
}
const worstTransientLoss = Math.min(...transientDeltas);
const highDeltaDb = ratioDb(highDifferenceProxy(output), highDifferenceProxy(input));
assert(worstTransientLoss > -3.2, `piano attack/body ratio collapsed: ${worstTransientLoss.toFixed(2)} dB`);
assert(highDeltaDb < 3.2, `piano high-difference energy increased excessively: ${highDeltaDb.toFixed(2)} dB`);
assert(Number(result.info?.limiterActivePct || 0) < 82, `piano limiter remained active too long: ${result.info?.limiterActivePct}`);
assert(Math.abs(Number(result.info?.limiterReductionDb || 0)) < 8.5, `piano limiter reduction excessive: ${result.info?.limiterReductionDb}`);

console.log('PASS v1.6.58 piano transient integrity:', {
  worstTransientLossDb: Number(worstTransientLoss.toFixed(2)),
  highDifferenceDeltaDb: Number(highDeltaDb.toFixed(2)),
  limiterReductionDb: Number(Number(result.info?.limiterReductionDb || 0).toFixed(2)),
  limiterActivePct: Number(Number(result.info?.limiterActivePct || 0).toFixed(1)),
  peakDb: Number((20 * Math.log10(Math.max(1e-9, samplePeak(output)))).toFixed(2))
});
