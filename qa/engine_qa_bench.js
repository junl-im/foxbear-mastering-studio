#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sampleRate = 44100;
const duration = 1.35;
const length = Math.floor(sampleRate * duration);
const ceilingDb = -1.0;
const ceiling = Math.pow(10, ceilingDb / 20);

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function loadClassicWorker(relativePath) {
  const code = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const sandbox = {
    console,
    Float32Array,
    Float64Array,
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
  vm.runInContext(code, sandbox, { filename: relativePath });
  if (typeof sandbox.self.onmessage !== 'function') {
    throw new Error(`${relativePath} did not register self.onmessage`);
  }
  return payload => {
    let posted = null;
    sandbox.self.postMessage = msg => { posted = msg; };
    sandbox.self.onmessage({ data: payload });
    if (!posted) throw new Error(`${relativePath} did not post a response`);
    return posted;
  };
}

const analyzeWorker = loadClassicWorker('src/workers/analysis.worker.js');
const finalizerWorker = loadClassicWorker('src/workers/master-finalizer.worker.js');

function makeStereo(caseName) {
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const add = (freq, amp, phase = 0, side = 0, start = 0, end = duration) => {
    const startIdx = Math.floor(start * sampleRate);
    const endIdx = Math.min(length, Math.floor(end * sampleRate));
    for (let i = startIdx; i < endIdx; i += 1) {
      const t = i / sampleRate;
      const env = Math.min(1, Math.max(0, (t - start) * 18), Math.max(0, (end - t) * 18));
      const s = Math.sin(2 * Math.PI * freq * t + phase) * amp * env;
      left[i] += s * (1 + side);
      right[i] += s * (1 - side);
    }
  };
  const addNoise = (amp, hp = false) => {
    let prev = 0;
    let seed = 1234567;
    for (let i = 0; i < length; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const raw = ((seed / 0xffffffff) * 2 - 1) * amp;
      const shaped = hp ? raw - prev * 0.86 : raw;
      prev = raw;
      left[i] += shaped;
      right[i] += shaped * 0.98;
    }
  };
  if (caseName === 'balancedPop') {
    add(95, 0.18);
    add(180, 0.14);
    add(720, 0.09);
    add(1900, 0.045);
    add(7200, 0.018);
    addNoise(0.006, true);
  } else if (caseName === 'vocalMetallic') {
    add(165, 0.13);
    add(520, 0.10);
    add(2950, 0.12);
    add(5300, 0.10, 0.2);
    add(7600, 0.07, 0.4);
    addNoise(0.008, true);
  } else if (caseName === 'mobileBoom') {
    add(82, 0.26);
    add(235, 0.22);
    add(390, 0.20);
    add(3100, 0.08);
    addNoise(0.004, false);
  } else if (caseName === 'wideLow') {
    add(105, 0.22, 0, 0.85);
    add(105, 0.18, Math.PI, -0.85);
    add(720, 0.08, 0, 0.3);
    add(4200, 0.04, 0, 0.6);
    addNoise(0.005, true);
  } else if (caseName === 'peakStress') {
    add(1000, 0.14);
    add(60, 0.10);
    for (let i = Math.floor(sampleRate * 0.35); i < length; i += Math.floor(sampleRate * 0.41)) {
      left[i] = 1.15;
      right[i] = -1.12;
      if (i + 1 < length) {
        left[i + 1] = -0.95;
        right[i + 1] = 0.92;
      }
    }
  } else {
    throw new Error(`unknown QA case ${caseName}`);
  }
  for (let i = 0; i < length; i += 1) {
    left[i] = clamp(left[i], -1.2, 1.2);
    right[i] = clamp(right[i], -1.2, 1.2);
  }
  return [left, right];
}

function hasNonFinite(buffers) {
  for (const data of buffers) {
    for (let i = 0; i < data.length; i += 1) {
      if (!Number.isFinite(data[i])) return true;
    }
  }
  return false;
}

function samplePeak(buffers) {
  let peak = 0;
  for (const data of buffers) {
    for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i] || 0));
  }
  return peak;
}

function assertFiniteNumber(label, value, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} out of range: ${value}`);
  }
}

const cases = ['balancedPop', 'vocalMetallic', 'mobileBoom', 'peakStress'];
const rows = [];
for (const name of cases) {
  const input = makeStereo(name);
  const analysisResult = analyzeWorker({
    sampleRate,
    duration,
    channels: 2,
    length,
    channelBuffers: input.map(buf => buf.buffer)
  });
  if (!analysisResult.ok) throw new Error(`${name} analysis failed: ${analysisResult.error}`);
  const analysis = analysisResult.analysis || {};
  assertFiniteNumber(`${name} analysis loudnessIntegrated`, analysis.loudnessIntegrated, -90, 12);
  assertFiniteNumber(`${name} analysis peakDb`, analysis.peakDb, -120, 12);
  assertFiniteNumber(`${name} analysis brightness`, analysis.brightness, 0, 1);
  assertFiniteNumber(`${name} analysis mobileSpeakerRisk`, analysis.mobileSpeakerRisk, 0, 1);
  if (!Array.isArray(analysis.spectrumProfile) || analysis.spectrumProfile.length !== 24) {
    throw new Error(`${name} expected 24-band spectrumProfile`);
  }
  if (hasNonFinite(input)) throw new Error(`${name} input contains non-finite samples`);

  const freshInput = makeStereo(name);
  const finalResult = finalizerWorker({
    sampleRate,
    channels: 2,
    length,
    targetLufs: -14,
    ceilingDb,
    qualityMode: 'balanced',
    truePeak: true,
    analysis,
    channelBuffers: freshInput.map(buf => buf.buffer)
  });
  if (!finalResult.ok) throw new Error(`${name} finalizer failed: ${finalResult.error}`);
  const output = finalResult.channelBuffers.map(buf => new Float32Array(buf));
  const info = finalResult.info || {};
  if (hasNonFinite(output)) throw new Error(`${name} final output contains non-finite samples`);
  assertFiniteNumber(`${name} loudnessAfter`, info.loudnessAfter, -28, -6);
  assertFiniteNumber(`${name} peakAfter`, info.peakAfter, 0, ceiling * 1.012);
  assertFiniteNumber(`${name} limiterReductionDb`, info.limiterReductionDb, -18, 18);
  assertFiniteNumber(`${name} multibandReductionDb`, info.multibandReductionDb, -12, 12);
  assertFiniteNumber(`${name} dynamicDeEsserRisk`, info.dynamicDeEsserRisk || 0, 0, 1);
  assertFiniteNumber(`${name} dynamicDeEsserReductionDb`, info.dynamicDeEsserReductionDb || 0, -12, 1);
  assertFiniteNumber(`${name} sample peak`, samplePeak(output), 0, ceiling * 1.012);
  if (info.oversample !== 4) throw new Error(`${name} expected 4x true peak oversampling`);
  if (!String(info.loudnessStandard || '').includes('K-weighting')) throw new Error(`${name} missing K-weighting report`);
  if (name === 'mobileBoom' && !(info.mobileSpeakerRisk > 0.25 || (info.mobileSpeakerCuts || []).length > 0)) {
    throw new Error('mobileBoom should trigger mobile speaker risk or cuts');
  }
  if (name === 'vocalMetallic' && !(info.dynamicDeEsserRisk > 0.16 && info.dynamicDeEsserMode !== 'bypass')) {
    throw new Error('vocalMetallic should trigger dynamic de-esser/harshness suppression');
  }
  if (name === 'peakStress' && !(Math.abs(info.limiterReductionDb) > 0.1 || info.gainDb < 0)) {
    throw new Error('peakStress should trigger limiter or safety gain');
  }
  rows.push({
    case: name,
    lufsIn: Number(analysis.loudnessIntegrated).toFixed(2),
    lufsOut: Number(info.loudnessAfter).toFixed(2),
    tpOut: Number(20 * Math.log10(Math.max(1e-12, info.peakAfter))).toFixed(2),
    limiterDb: Number(info.limiterReductionDb).toFixed(2),
    multibandDb: Number(info.multibandReductionDb).toFixed(2),
    deEssDb: Number(info.dynamicDeEsserReductionDb || 0).toFixed(2),
    deEssRisk: Number(info.dynamicDeEsserRisk || 0).toFixed(2),
    mobileRisk: Number(info.mobileSpeakerRisk || 0).toFixed(2)
  });
}
console.table(rows);
console.log('PASS engine QA bench: analysis/finalizer synthetic audio safety checks passed');
