#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function loadWorker(relativePath) {
  const sandbox = {
    console, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, ArrayBuffer, DataView,
    Math, Number, String, Boolean, Array, Object, Map, Set, JSON, Date,
    isFinite, parseFloat, parseInt, self: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(read(relativePath), sandbox, { filename: relativePath });
  return payload => {
    const messages = [];
    sandbox.self.postMessage = message => messages.push(message);
    sandbox.self.onmessage({ data: payload });
    return messages.filter(message => !message?.__foxbearProgress).at(-1);
  };
}

function makeBuffer({ sampleRate = 44100, duration = 1, channels = 2, kind = 'tone' } = {}) {
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    let value = 0;
    if (kind === 'tone') value = 0.19 * Math.sin(2 * Math.PI * 180 * t) + 0.08 * Math.sin(2 * Math.PI * 1800 * t);
    else if (kind === 'sibilant') value = 0.11 * Math.sin(2 * Math.PI * 210 * t) + 0.10 * Math.sin(2 * Math.PI * 7200 * t);
    else if (kind === 'clip') value = i % Math.max(1, Math.floor(sampleRate * 0.13)) < 2 ? 1.45 : 0.18 * Math.sin(2 * Math.PI * 520 * t);
    data.forEach((channel, index) => { channel[i] = index ? value * 0.97 : value; });
  }
  return {
    sampleRate, duration, numberOfChannels: channels, length,
    getChannelData(index) { return data[index]; },
    channelData: data
  };
}

function allFinite(buffers) {
  return buffers.every(data => {
    for (let i = 0; i < data.length; i += 1) if (!Number.isFinite(data[i])) return false;
    return true;
  });
}

const guardContext = vm.createContext({ window: null, globalThis: null, console, Math, Number, Object, Array, Error });
guardContext.window = guardContext;
guardContext.globalThis = guardContext;
vm.runInContext(read('src/audio/mastering-input-guard-service.js'), guardContext, { filename: 'mastering-input-guard-service.js' });
const guard = guardContext.FoxBearMasteringInputGuard;
assert(guard, 'mastering input guard missing');
assert.strictEqual(guard.inspect(makeBuffer({ kind: 'tone' })).ok, true, 'normal signal rejected');
assert.strictEqual(guard.inspect(makeBuffer({ kind: 'silence' })).code, 'MASTERING_INPUT_SILENT', 'silence was not rejected');
assert.strictEqual(guard.inspect(makeBuffer({ duration: 0.05, kind: 'tone' })).code, 'MASTERING_INPUT_TOO_SHORT', 'too-short input was not rejected');
const corrupt = makeBuffer({ kind: 'tone' });
for (let i = 0; i < corrupt.length; i += 3) corrupt.channelData[0][i] = NaN;
assert.strictEqual(guard.inspect(corrupt).code, 'MASTERING_INPUT_CORRUPT', 'corrupt sample ratio was not rejected');

const finalizer = loadWorker('src/workers/master-finalizer.worker.js');
function finalize(buffer, analysis = {}) {
  return finalizer({
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    length: buffer.length,
    targetLufs: -14,
    ceilingDb: -1,
    qualityMode: 'balanced',
    truePeak: true,
    analysis,
    channelBuffers: buffer.channelData.map(channel => channel.buffer)
  });
}

const silentResult = finalize(makeBuffer({ kind: 'silence' }));
assert.strictEqual(silentResult.ok, false, 'finalizer reported silent audio as success');
assert(/무음|신호/.test(silentResult.error), 'silent finalizer error is not actionable');
const shortResult = finalize(makeBuffer({ duration: 0.05, kind: 'tone' }));
assert.strictEqual(shortResult.ok, false, 'finalizer reported too-short audio as success');
assert.strictEqual(shortResult.code, 'MASTERING_INPUT_TOO_SHORT', 'short-input error code was lost');
const corruptWorkerInput = makeBuffer({ kind: 'tone' });
for (let i = 0; i < corruptWorkerInput.length; i += 3) corruptWorkerInput.channelData[0][i] = NaN;
const corruptWorkerResult = finalize(corruptWorkerInput);
assert.strictEqual(corruptWorkerResult.ok, false, 'finalizer sanitized corrupt audio before validating it');
assert.strictEqual(corruptWorkerResult.code, 'MASTERING_INPUT_CORRUPT', 'corrupt-input error code was lost');

const highRateCases = [
  makeBuffer({ sampleRate: 96000, duration: 0.45, channels: 2, kind: 'tone' }),
  makeBuffer({ sampleRate: 192000, duration: 0.30, channels: 1, kind: 'sibilant' })
];
for (const input of highRateCases) {
  const result = finalize(input, { brightness: 0.55, metallicHint: 0.35, lowMonoScore: 100 });
  assert.strictEqual(result.ok, true, `${input.sampleRate}Hz finalizer failed: ${result.error || ''}`);
  const output = result.channelBuffers.map(buffer => new Float32Array(buffer));
  assert(allFinite(output), `${input.sampleRate}Hz output contains non-finite samples`);
  assert(result.info.peakAfter <= Math.pow(10, -1 / 20) * 1.012, `${input.sampleRate}Hz true peak ceiling exceeded`);
  assert(Math.abs(result.info.loudnessAfter + 14) < 1.25, `${input.sampleRate}Hz target LUFS drifted`);
  assert.strictEqual(result.info.inputHealth.ok, true, 'input health was not recorded');
}

const malformedInput = makeBuffer({ kind: 'tone' });
const malformedResult = finalize(malformedInput, {
  bassRatio: NaN,
  lowMidRatio: Infinity,
  lowMonoScore: NaN,
  harshPeakHz: NaN,
  targetDynamicFreq: Infinity,
  mobileSpeakerDetail: { boom: NaN, box: Infinity, honk: 'bad', harsh: -Infinity, density: null }
});
assert.strictEqual(malformedResult.ok, true, `malformed analysis poisoned finalizer: ${malformedResult.error || ''}`);
assert(Number.isFinite(malformedResult.info.mobileSpeakerRisk), 'mobile risk is not finite');
assert(Object.values(malformedResult.info.mobileSpeakerCuts || {}).every(Number.isFinite), 'mobile cuts contain non-finite values');

const recommendationContext = vm.createContext({ window: null, globalThis: null, console, Math, Number, Object, Array, Set, Map });
recommendationContext.window = recommendationContext;
recommendationContext.globalThis = recommendationContext;
vm.runInContext(read('src/config/genre-presets.js'), recommendationContext, { filename: 'genre-presets.js' });
vm.runInContext(read('src/recommendation/recommendation-engine.js'), recommendationContext, { filename: 'recommendation-engine.js' });
const recommendationEngine = vm.runInContext(`FoxBearRecommendationEngine.createRecommendationEngine({
  GENRE_PRESETS,
  PRESET_LABELS,
  clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value))),
  clamp01: value => Math.min(1, Math.max(0, Number(value))),
  estimateMobileSpeakerRisk: () => ({ risk: NaN })
})`, recommendationContext);
const malformedFeatures = recommendationEngine.extractGenreFeatures({
  brightness: NaN, stereoWidth: Infinity, crest: 'bad', loudnessHint: undefined,
  bassRatio: NaN, highRatio: Infinity, spectralCentroidHz: NaN, spatialExcessRisk: Infinity,
  spectrumBands: { sub: NaN, presence: Infinity, air: 'bad' }
});
for (const [key, value] of Object.entries(malformedFeatures)) {
  assert(Number.isFinite(value), `recommendation feature ${key} is not finite`);
}
const genrePresets = vm.runInContext('GENRE_PRESETS', recommendationContext);
const recommendation = recommendationEngine.safeRecommendPreset('edge_case.wav', {
  brightness: NaN, stereoWidth: Infinity, crest: 'bad', loudnessIntegrated: -16,
  bassRatio: NaN, highRatio: Infinity, spatialExcessRisk: Infinity
}, 'qa-edge');
assert(recommendation.preset && genrePresets[recommendation.preset], 'recommendation fallback produced invalid preset');
assert(Number.isFinite(recommendation.confidence), 'recommendation confidence is not finite');

const qualityContext = vm.createContext({ window: null, console, Math, Number, Object, Array, Date });
qualityContext.window = qualityContext;
vm.runInContext(read('src/audio/quality-gate-service.js'), qualityContext, { filename: 'quality-gate-service.js' });
const clipped = finalize(makeBuffer({ channels: 1, kind: 'clip' }));
assert.strictEqual(clipped.ok, true, 'clipped stress finalizer failed unexpectedly');
const gate = qualityContext.FoxBearQualityGateService.createReport({
  report: {
    target: { lufs: -14, ceilingDb: -1 },
    after: { approxLufs: clipped.info.loudnessAfter, durationSec: 1, invalidSamples: 0, clippedSamples: 0, truePeakDbTP: 20 * Math.log10(clipped.info.peakAfter), dcOffsetAvg: 0 },
    loudness: { shortTermAfter: clipped.info.shortTermLufs }
  },
  finalizeInfo: clipped.info
});
assert(gate.items.some(item => item.label === 'Limiter 과보정' && item.status !== 'pass'), 'clipped stress was not flagged by limiter quality gate');

const app = read('src/app.js');
assert(app.includes('FoxBearMasteringInputGuard.assertMasterable'), 'mastering input guard is not wired into masterTrack');
for (const checkpoint of ['decode', 'emergency-analysis', 'pitch-speed', 'master-render', 'finalizer', 'encode']) {
  assert(app.includes(`assertMasteringJobActive('${checkpoint}')`), `mastering cancellation checkpoint missing: ${checkpoint}`);
}

const pkg = JSON.parse(read('package.json'));
assert(pkg.qaChecks.includes('node --check src/audio/mastering-input-guard-service.js'), 'input guard syntax check is not registered');
assert(pkg.qaChecks.includes('node qa/v1547_engine_edgecase_quality_smoke.js'), 'v1.6.73 QA is not registered');
const status = read('STATUS.md');
const currentVersionLine = `- Product version: \`${pkg.version}\``;
assert(status.startsWith(`# FoxBear Status - v${pkg.version}`), 'STATUS title is stale');
assert.strictEqual(status.split(currentVersionLine).length - 1, 2, 'STATUS current metadata sections are not synchronized');
const metadataTool = read('tools/sync-release-metadata.js');
assert(metadataTool.includes("markdownSection(status, 'Release metadata')"), 'version checker does not inspect the STATUS release metadata section');
assert(metadataTool.includes('releaseMetadataStatus') && metadataTool.includes('product version is not synchronized'), 'stale STATUS metadata is not release-blocking');

console.log(`PASS v1.5.47 engine edge-case quality: ${highRateCases.map(item => `${item.sampleRate}Hz`).join('/')} · ${recommendation.preset} · ${gate.status}`);
