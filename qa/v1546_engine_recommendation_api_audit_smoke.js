#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function extractFunction(source, name) {
  const token = `function ${name}(`;
  const start = source.indexOf(token);
  assert(start >= 0, `${name} function missing`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} function end missing`);
}

function loadRecommendationEngine() {
  const context = vm.createContext({ window: null, globalThis: null, console, Math, Number, Object, Array, Set, Map });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(read('src/config/genre-presets.js'), context, { filename: 'genre-presets.js' });
  vm.runInContext(read('src/recommendation/recommendation-engine.js'), context, { filename: 'recommendation-engine.js' });
  return vm.runInContext(`FoxBearRecommendationEngine.createRecommendationEngine({
    GENRE_PRESETS,
    PRESET_LABELS,
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value))),
    clamp01: value => Math.min(1, Math.max(0, Number(value) || 0)),
    estimateMobileSpeakerRisk: analysis => ({ risk: Math.min(1, Math.max(0, Number(analysis.mobileSpeakerRisk) || 0)) })
  })`, context);
}

function loadRecommendedSettingsFunction() {
  const app = read('src/app.js');
  const functionSource = extractFunction(app, 'makeRecommendedSettings');
  const context = vm.createContext({
    console,
    Math,
    Number,
    Object,
    GENRE_PRESETS: {
      custom: { clarity: 50, warmth: 55, width: 28, stereoGroove: 12, analogGroove: 6, dynamicPunch: 35, metallicRemoval: 42, intensity: 100 },
      pop: { clarity: 57, warmth: 55, width: 42, stereoGroove: 10, analogGroove: 4, dynamicPunch: 38, metallicRemoval: 46, intensity: 105 }
    },
    cloneSettings(settings) { return { ...settings }; },
    clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); },
    clamp01(value) { return Math.min(1, Math.max(0, Number(value) || 0)); },
    estimateMobileSpeakerRisk() { return { risk: 0, box: 0, boom: 0, density: 0, harsh: 0 }; },
    getMasteringIntensity(settings) { return { raw: Number(settings.intensity || 100), amount: 1 }; },
    applyReferenceToSettings(settings) { return settings; }
  });
  vm.runInContext(`${functionSource}; this.makeRecommendedSettings = makeRecommendedSettings;`, context);
  return context.makeRecommendedSettings;
}

function loadQualityGate() {
  const context = vm.createContext({ window: null, console, Math, Number, Object, Array, Date });
  context.window = context;
  vm.runInContext(read('src/audio/quality-gate-service.js'), context, { filename: 'quality-gate-service.js' });
  return context.FoxBearQualityGateService;
}

const app = read('src/app.js');
const firebase = read('src/firebase-bootstrap.js');
const download = read('src/download/download-service.js');
const pkg = JSON.parse(read('package.json'));

assert(firebase.includes("const FIREBASE_SDK_VERSION = '12.16.0';"), 'Firebase SDK is not pinned to audited 12.16.0');
assert(download.includes("global.isSecureContext && typeof global.showSaveFilePicker === 'function'"), 'File System Access capability guard regressed');
assert(download.includes('navigator.canShare'), 'Web Share file capability check missing');
assert(app.includes("document.visibilityState === 'visible'"), 'Wake Lock visibility reacquisition guard missing');
assert(!app.includes("track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));\n            track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));"), 'AI recommendation is applied twice');
assert(app.includes('track?.finalizeInfo?.targetLufs ?? track?.masterReport?.target?.lufs'), 'mastered filename does not use actual adaptive LUFS target');
assert(app.includes('track.finalizeInfo?.targetLufs ?? track.masterReport?.target?.lufs'), 'export report does not preserve rendered LUFS target');
assert(app.includes('recommendationApplication'), 'master report does not audit recommended/requested/effective settings');
assert(app.includes('effectiveSettings: appliedProfile?.effectiveSettings'), 'effective DSP settings are not captured in the master report');
assert(pkg.qaChecks.includes('node qa/v1546_engine_recommendation_api_audit_smoke.js'), 'v1.6.90 audit test is not registered');

const engine = loadRecommendationEngine();
const recommendation = engine.safeRecommendPreset('vocal_pop_demo.wav', {
  brightness: 0.58,
  stereoWidth: 0.36,
  crest: 4.8,
  metallicHint: 0.32,
  loudnessHint: -15,
  bassRatio: 0.22,
  lowMidRatio: 0.27,
  midRatio: 0.34,
  highRatio: 0.22,
  transientDensity: 0.38,
  spectrumBands: { sub: 0.05, presence: 0.18, air: 0.08 }
}, 'qa');
assert(recommendation.preset && recommendation.preset !== 'custom', 'recommendation engine returned no usable preset');
assert(Number.isFinite(recommendation.confidence), 'recommendation confidence is not finite');

const makeRecommendedSettings = loadRecommendedSettingsFunction();
const incomplete = makeRecommendedSettings('pop', { brightness: undefined, stereoWidth: NaN, crest: Infinity, metallicHint: null });
for (const [key, value] of Object.entries(incomplete)) {
  assert(Number.isFinite(Number(value)), `incomplete analysis poisoned recommended setting ${key}`);
}
const brightMetallic = makeRecommendedSettings('pop', { brightness: 0.84, stereoWidth: 0.62, crest: 6.8, metallicHint: 0.88, spatialExcessRisk: 0.5, lowMonoScore: 62, widthRecommendationLimit: 48 });
assert(brightMetallic.metallicRemoval > incomplete.metallicRemoval, 'metallic risk did not increase metallic removal');
assert(brightMetallic.width <= 48, 'spatial safety limit was not applied to recommendation');

const qualityGate = loadQualityGate();
const truePeakAmplitude = Math.pow(10, -0.45 / 20);
const report = qualityGate.createReport({
  report: {
    target: { lufs: -14, ceilingDb: -1 },
    after: { approxLufs: -14, peakDb: -2.4, samplePeakDb: -2.4, durationSec: 10, invalidSamples: 0, clippedSamples: 0, dcOffsetAvg: 0 },
    loudness: { shortTermAfter: { max: -13, min: -16, range: 3 } }
  },
  finalizeInfo: { targetLufs: -14, ceilingDb: -1, loudnessAfter: -14, peakAfter: truePeakAmplitude }
});
const peakItem = report.items.find(item => /Peak 천장/.test(item.label));
assert(peakItem, 'quality gate true-peak item missing');
assert.strictEqual(peakItem.label, 'True Peak 천장', 'quality gate did not prefer true peak');
assert.strictEqual(peakItem.status, 'warn', 'true-peak ceiling violation was hidden by lower sample peak');
assert.strictEqual(peakItem.meta.peakUnit, 'dBTP', 'true-peak unit is incorrect');

console.log(`PASS v1.5.46 engine/recommendation/API audit: ${recommendation.preset} ${recommendation.confidence}% · True Peak ${peakItem.status}`);
