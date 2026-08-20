#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('src/app.js', 'utf8');
const coreSource = fs.readFileSync('src/utils/core-utils.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert(app.includes('removeDcOffsetAudioBufferCooperative'), 'mastering should expose cooperative DC cleanup');
assert(app.includes('sanitizeAudioBufferCooperative'), 'mastering should expose cooperative PCM safety scan');
assert(app.includes('createWaveformOverviewAsync'), 'mastering should expose cooperative waveform overview');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 30, 34"), 'DC cleanup should map real work into 30-34 percent');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 34, 39"), 'PCM safety cleanup should map real work into 34-39 percent');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 79, 80"), 'post-render PCM validation should stay cooperative');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 94, 95"), 'final PCM validation should stay cooperative');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 95, 95"), 'A/B waveform work should report live substage progress without lying about overall completion');
assert(app.includes("quality-recovery-master-sanitize") && app.includes("quality-recovery-finalizer-sanitize"), 'quality recovery should also avoid long synchronous PCM safety scans');
assert(app.split('\n').length - 1 < 13250, 'app.js should remain below the 13,250 line architecture gate');
assert(coreSource.includes('Number(options.chunkSamples) || 65536'), 'cooperative PCM checkpoints should default to 65,536 samples');
assert(coreSource.includes('Number(options.budgetMs)) ? Number(options.budgetMs) : 10'), 'cooperative PCM work should use a 10ms default yield budget');

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  Promise,
  performance: { now: (() => { let tick = 0; return () => (tick += 11); })() }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox);
const utils = sandbox.FoxBearCoreUtils;
for (const name of ['removeDcOffsetAudioBufferCooperative', 'sanitizeAudioBufferCooperative', 'sampleWaveformOverviewAsync', 'createWaveformOverviewAsync']) {
  assert.strictEqual(typeof utils[name], 'function', `${name} should be exported from core utils`);
}

function makeBuffer(channels) {
  const data = channels.map(values => Float32Array.from(values));
  return {
    numberOfChannels: data.length,
    length: data[0].length,
    sampleRate: 48000,
    duration: data[0].length / 48000,
    getChannelData(index) { return data[index]; },
    data
  };
}
function baselineDc(buffer) {
  const offsets = [];
  let maxOffset = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += Number.isFinite(data[i]) ? data[i] : 0;
    const mean = sum / Math.max(1, data.length);
    offsets.push(mean);
    maxOffset = Math.max(maxOffset, Math.abs(mean));
  }
  if (maxOffset <= 1e-6) return { applied: false, offsets, maxOffset, maxOffsetDb: 20 * Math.log10(Math.max(0.000001, Math.abs(maxOffset))) };
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    const mean = offsets[ch] || 0;
    for (let i = 0; i < data.length; i += 1) data[i] = (Number.isFinite(data[i]) ? data[i] : 0) - mean;
  }
  return { applied: true, offsets, maxOffset, maxOffsetDb: 20 * Math.log10(Math.max(0.000001, Math.abs(maxOffset))) };
}
function baselineSanitize(buffer) {
  let repaired = 0;
  let clipped = 0;
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i += 1) {
      let value = data[i];
      if (!Number.isFinite(value)) { value = 0; repaired += 1; }
      if (value > 8 || value < -8) { value = Math.min(8, Math.max(-8, value)); clipped += 1; }
      data[i] = value;
      peak = Math.max(peak, Math.abs(value));
    }
  }
  const peakBefore = peak;
  if (peak > 4) {
    const gain = 4 / peak;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i += 1) data[i] *= gain;
    }
    clipped += 1;
    peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
  }
  return { repaired, clipped, peakBefore, peakAfter: peak };
}
function assertBufferEqual(actual, expected, message) {
  assert.strictEqual(actual.numberOfChannels, expected.numberOfChannels, message);
  for (let ch = 0; ch < actual.numberOfChannels; ch += 1) {
    assert.deepStrictEqual(Array.from(actual.getChannelData(ch)), Array.from(expected.getChannelData(ch)), `${message} ch=${ch}`);
  }
}

(async () => {
  const length = 220000;
  const left = Array.from({ length }, (_, i) => Math.sin(i * 0.013) * 0.8 + 0.0025);
  const right = left.map((value, i) => value * 0.73 + Math.cos(i * 0.017) * 0.04 + 0.0012);
  left[123] = Number.NaN;
  right[345] = Number.NaN;
  const baselineDcBuffer = makeBuffer([left, right]);
  const cooperativeDcBuffer = makeBuffer([left, right]);
  const expectedDc = baselineDc(baselineDcBuffer);
  const dcProgress = [];
  let yieldCount = 0;
  const actualDc = await utils.removeDcOffsetAudioBufferCooperative(cooperativeDcBuffer, {
    budgetMs: 0,
    chunkSamples: 65536,
    yieldFn: () => { yieldCount += 1; },
    onProgress: progress => dcProgress.push(progress.percent)
  });
  assert.strictEqual(JSON.stringify(actualDc), JSON.stringify(expectedDc), 'cooperative DC cleanup must preserve the legacy numeric result');
  assertBufferEqual(cooperativeDcBuffer, baselineDcBuffer, 'cooperative DC cleanup must preserve PCM output');
  assert(yieldCount >= 4, 'long DC cleanup should yield multiple times');
  assert.strictEqual(dcProgress.at(-1), 100, 'DC cleanup should finish at 100 percent of its own stage');

  const hotLeft = Array.from({ length }, (_, i) => Math.sin(i * 0.009) * 5.4);
  const hotRight = hotLeft.map(value => value * 0.81);
  hotLeft[100] = Number.NaN;
  hotLeft[200] = 10;
  hotRight[300] = -11;
  const baselineSanBuffer = makeBuffer([hotLeft, hotRight]);
  const cooperativeSanBuffer = makeBuffer([hotLeft, hotRight]);
  const expectedSan = baselineSanitize(baselineSanBuffer);
  const sanProgress = [];
  const beforeSanYields = yieldCount;
  const actualSan = await utils.sanitizeAudioBufferCooperative(cooperativeSanBuffer, 'qa', {
    budgetMs: 0,
    chunkSamples: 65536,
    yieldFn: () => { yieldCount += 1; },
    onProgress: progress => sanProgress.push(progress.percent)
  });
  assert.strictEqual(JSON.stringify(actualSan), JSON.stringify(expectedSan), 'cooperative sanitizer must preserve the legacy safety result');
  assertBufferEqual(cooperativeSanBuffer, baselineSanBuffer, 'cooperative sanitizer must preserve PCM output');
  assert(yieldCount > beforeSanYields, 'long sanitize/gain/peak passes should yield to the browser');
  assert.strictEqual(sanProgress.at(-1), 100, 'sanitizer should finish at 100 percent of its own stage');

  const syncWave = utils.createWaveformOverview(cooperativeDcBuffer, cooperativeSanBuffer, 24);
  const asyncWave = await utils.createWaveformOverviewAsync(cooperativeDcBuffer, cooperativeSanBuffer, 24, { budgetMs: 0, yieldFn: () => { yieldCount += 1; } });
  assert.strictEqual(JSON.stringify(asyncWave), JSON.stringify(syncWave), 'cooperative waveform overview must preserve existing waveform values and markers');

  let beforeReads = 0;
  let afterReads = 0;
  const countedBefore = { ...cooperativeDcBuffer, getChannelData(index) { beforeReads += 1; return cooperativeDcBuffer.getChannelData(index); } };
  const countedAfter = { ...cooperativeSanBuffer, getChannelData(index) { afterReads += 1; return cooperativeSanBuffer.getChannelData(index); } };
  utils.createWaveformOverview(countedBefore, countedAfter, 24);
  assert.strictEqual(beforeReads, 24 * Math.min(2, countedBefore.numberOfChannels), 'waveform markers should reuse already sampled original overview instead of rescanning PCM');
  assert.strictEqual(afterReads, 24 * Math.min(2, countedAfter.numberOfChannels), 'waveform markers should reuse already sampled mastered overview instead of rescanning PCM');

  assert(pkg.qaChecks.includes('node qa/v16109_mastering_cooperative_pcm_responsiveness_smoke.js') || pkg.version === '1.6.110', 'v1.6.110 QA must be registered before release');
  console.log('PASS v1.6.109 mastering cooperative PCM responsiveness smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
