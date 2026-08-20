#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('src/app.js', 'utf8');
const perf = fs.readFileSync('src/boot/performance-diagnostics.js', 'utf8');
const fallbackSource = fs.readFileSync('src/audio/master-finalizer-fallback-service.js', 'utf8');

const validated = app.indexOf('await getDownloadService().assertDownloadBlob(encoded.blob);');
const fence = app.indexOf("assertMasteringJobActive('download-blob-validated');", validated);
const objectUrl = app.indexOf('URL.createObjectURL(encoded.blob)', validated);
assert(validated >= 0 && fence > validated && objectUrl > fence, 'master commit fence must run after blob validation and before object URL commit');

const waitStart = app.indexOf('async function waitForTrackAnalysisIfNeeded');
const waitEnd = app.indexOf('function getQualityRecoveryE2EControl', waitStart);
const waitSource = app.slice(waitStart, waitEnd);
const cancelGuard = waitSource.indexOf('isAnalysisCancellationError(error) || !isTrackStillImported(track)');
const incident = waitSource.indexOf("reportOperationalIncident('mastering'");
assert(cancelGuard >= 0 && incident > cancelGuard, 'analysis cancellation must be handled before operational incident reporting');
assert(waitSource.includes("track.status === 'analyzing'"));
assert(waitSource.includes("track.status = track.analysis ? 'ready' : 'queued'"));

assert(perf.includes("global.addEventListener?.('pageshow'"), 'performance diagnostics must resume on pageshow');
assert(perf.includes("event?.persisted ? 'ambient-health-bfcache-resume'"), 'BFCache resume reason missing');
assert(perf.includes('state.ambientLifecycleBound'), 'ambient lifecycle listener dedupe missing');
assert(perf.includes('state.ambientMonitorStarted = false'), 'pagehide must mark ambient monitor stopped');

const sandbox = { window: null, console, Math, Number, String, Boolean, Object, Array, Promise, Error, setTimeout, clearTimeout };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fallbackSource, sandbox, { filename: 'master-finalizer-fallback-service.js' });
const service = sandbox.FoxBearMasterFinalizerFallbackService;
assert(service && typeof service.run === 'function');

class FakeBuffer {
  constructor(channels, sampleRate = 48000) {
    this._channels = channels.map(values => new Float32Array(values));
    this.numberOfChannels = this._channels.length;
    this.length = this._channels[0]?.length || 0;
    this.sampleRate = sampleRate;
    this.duration = this.length / sampleRate;
  }
  getChannelData(ch) { return this._channels[ch]; }
  copyToChannel(values, ch, offset = 0) { this._channels[ch].set(values, offset); }
}
const sourceChannels = [Array.from({ length: 131072 }, (_, i) => Math.sin(i * 0.001) * 0.1), Array.from({ length: 131072 }, (_, i) => Math.cos(i * 0.001) * 0.1)];
const input = new FakeBuffer(sourceChannels);
let yields = 0;
const progress = [];
const deps = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  yieldFn: async () => { yields += 1; },
  makeAudioBuffer: (channels, length, sampleRate) => new FakeBuffer(Array.from({ length: channels }, () => new Array(length).fill(0)), sampleRate),
  sanitizeAudioBufferCooperative: async buffer => ({ repaired: 0, clipped: 0, peakBefore: 0.1, peakAfter: 0.1 }),
  removeDcOffsetAudioBufferCooperative: async () => ({ applied: false, offsets: [0, 0], maxOffset: 0, maxOffsetDb: -120 }),
  applyMobileSpeakerResonanceGuardBuffer: () => ({ mode: 'bypass', risk: 0, cuts: {} }),
  applyDynamicDeEsserBuffer: () => ({ mode: 'bypass', risk: 0, reductionDb: 0, bands: {} }),
  applyGentleMultibandDynamicsBuffer: () => ({ mode: 'bypass', reductionDb: 0, bands: {} }),
  measureApproxGatedLoudness: () => -14,
  applyBufferGain: (buffer, gain) => { for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) { const data = buffer.getChannelData(ch); for (let i = 0; i < data.length; i += 1) data[i] *= gain; } },
  applyTransparentLimiterGuard: () => ({ peakBefore: 0.1, peakAfter: 0.1, gain: 1, limiterReductionDb: 0, limiterMode: 'bypass', lookaheadMs: 0, lookaheadSamples: 0, preLimiterPeak: 0.1 }),
  measureKWeightedLoudnessBundleAudioBuffer: () => ({ integrated: -14, shortTerm: { min: -14, max: -14 } }),
  getSharedDspSummaryForReport: value => value || null,
  sharedDspProfileVersion: 'test',
  throwIfCancelled: () => {}
};

(async () => {
  const result = await service.run(input, { targetLufs: -14, ceilingDb: -1, qualityMode: 'balanced', truePeak: true, onProgress: item => progress.push(item) }, deps);
  assert(yields >= 7, `fallback should yield repeatedly, got ${yields}`);
  assert(progress.some(item => item.percent === 100), 'fallback completion progress missing');
  for (let ch = 0; ch < input.numberOfChannels; ch += 1) assert.deepStrictEqual(Array.from(result.buffer.getChannelData(ch)), Array.from(input.getChannelData(ch)), `fallback clone changed samples on channel ${ch}`);

  let cancelYields = 0;
  const cancelError = new Error('cancelled'); cancelError.name = 'AbortError';
  await assert.rejects(() => service.run(input, { targetLufs: -14 }, { ...deps, yieldFn: async () => { cancelYields += 1; }, throwIfCancelled: () => { if (cancelYields >= 2) throw cancelError; } }), error => error?.name === 'AbortError');
  console.log('PASS v1.6.112 mastering lifecycle race hardening');
})().catch(error => { console.error(error); process.exit(1); });
