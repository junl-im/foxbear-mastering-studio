#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const read = file => fs.readFileSync(file, 'utf8');

const rules = read('firestore.rules');
const firebase = read('src/firebase-bootstrap.js');
const app = read('src/app.js');
const fallbackSource = read('src/audio/master-finalizer-fallback-service.js');
const worker = read('src/workers/master-finalizer.worker.js');

assert(rules.includes('match /incidentReports/{reportId}'));
assert(rules.includes('allow create: if false;'), 'incidentReports create must be server-only');
assert(!rules.includes('function validIncidentCreate(reportId)'), 'direct incident create validator must not return');
const logStart = firebase.indexOf('async function logIncident(payload = {})');
const logEnd = firebase.indexOf('async function getIncidentDelivery(reportId)', logStart);
const logSource = firebase.slice(logStart, logEnd);
assert(!logSource.includes('setDoc('), 'logIncident must not direct-write Firestore');
assert(!logSource.includes("submissionTransport: 'firestore-fallback'"), 'legacy incident fallback must remain removed');
assert(logSource.includes('foxbearServerOnlyIncident = true'), 'server-only failure marker missing');

const workerGain = worker.match(/const maxGainDb = qualityMode === 'max' \? ([0-9.]+) : qualityMode === 'fast' \? ([0-9.]+) : ([0-9.]+);/);
const fallbackGain = fallbackSource.match(/const maxGainDb = qualityMode === 'max' \? ([0-9.]+) : qualityMode === 'fast' \? ([0-9.]+) : ([0-9.]+);/);
assert(workerGain && fallbackGain, 'finalizer gain contracts must be detectable');
assert.deepStrictEqual(fallbackGain.slice(1), workerGain.slice(1), 'Worker/fallback gain ceilings must match');
assert(app.includes('activePct: activeSamples / Math.max(1, buffer.length) * 100'));
assert(app.includes('meanReductionDb: 20 * Math.log10(Math.max(1e-9, gainSum / Math.max(1, buffer.length)))'));
assert(app.includes('gainMovement: gainMovement / Math.max(1, buffer.length)'));
for (const key of ['limiterActivePct', 'limiterMeanReductionDb', 'limiterGainMovement']) {
  assert(fallbackSource.includes(`${key}: peakInfo.${key} || 0`), `fallback telemetry missing ${key}`);
}
assert(fallbackSource.includes("oversample: options.truePeak === false ? 1 : 4"), 'fallback oversample telemetry must reflect sample-peak mode');

const sandbox = { window: null, console, Math, Number, String, Boolean, Object, Array, Promise, Error, Date, setTimeout, clearTimeout };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fallbackSource, sandbox, { filename: 'master-finalizer-fallback-service.js' });
const service = sandbox.FoxBearMasterFinalizerFallbackService;
class FakeBuffer {
  constructor(values, sampleRate = 48000) { this._channels = [new Float32Array(values)]; this.numberOfChannels = 1; this.length = values.length; this.sampleRate = sampleRate; this.duration = this.length / sampleRate; }
  getChannelData(ch) { return this._channels[ch]; }
  copyToChannel(values, ch, offset = 0) { this._channels[ch].set(values, offset); }
}
const input = new FakeBuffer(new Array(2048).fill(0.05));
const deps = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  yieldFn: async () => {},
  makeAudioBuffer: (channels, length, sampleRate) => { const b = new FakeBuffer(new Array(length).fill(0), sampleRate); b._channels = Array.from({ length: channels }, () => new Float32Array(length)); b.numberOfChannels = channels; return b; },
  sanitizeAudioBufferCooperative: async () => ({}),
  removeDcOffsetAudioBufferCooperative: async () => ({}),
  applyMobileSpeakerResonanceGuardBuffer: () => ({ mode: 'bypass', risk: 0, cuts: {} }),
  applyDynamicDeEsserBuffer: () => ({ mode: 'bypass', risk: 0, reductionDb: 0, bands: {} }),
  applyGentleMultibandDynamicsBuffer: () => ({ mode: 'bypass', reductionDb: 0, bands: {} }),
  measureApproxGatedLoudness: () => -30,
  applyBufferGain: () => {},
  applyTransparentLimiterGuard: () => ({ peakBefore: 0.05, peakAfter: 0.05, gain: 1, limiterReductionDb: -1.2, limiterActivePct: 42.5, limiterMeanReductionDb: -0.6, limiterGainMovement: 0.012, limiterMode: 'lookaheadLimiter', lookaheadMs: 3, lookaheadSamples: 144, preLimiterPeak: 0.05 }),
  measureKWeightedLoudnessBundleAudioBuffer: () => ({ integrated: -23, shortTerm: { min: -23, max: -23 } }),
  getSharedDspSummaryForReport: value => value || null,
  throwIfCancelled: () => {}
};
(async () => {
  const result = await service.run(input, { targetLufs: -14, ceilingDb: -1, qualityMode: 'balanced', truePeak: false }, deps);
  assert.strictEqual(result.info.gainDb, 7, 'balanced fallback gain must match Worker +7 dB ceiling');
  assert.strictEqual(result.info.oversample, 1, 'sample-peak fallback must report 1x oversample');
  assert.strictEqual(result.info.limiterActivePct, 42.5);
  assert.strictEqual(result.info.limiterMeanReductionDb, -0.6);
  assert.strictEqual(result.info.limiterGainMovement, 0.012);
  console.log('PASS P1 incident server boundary and finalizer parity hardening');
})().catch(error => { console.error(error); process.exit(1); });
