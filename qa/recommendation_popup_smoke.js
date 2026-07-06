const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const listeners = [];
const fakeEl = () => ({
  addEventListener() {},
  classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  append() {},
  appendChild() {},
  remove() {},
  setAttribute() {},
  querySelector() { return fakeEl(); },
  querySelectorAll() { return []; },
  style: {},
  dataset: {},
  children: [],
  childNodes: [],
  textContent: '',
  innerHTML: '',
  value: '',
  disabled: false
});
const document = {
  baseURI: 'http://localhost/index.html',
  addEventListener(type, handler) { listeners.push({ type, handlerType: typeof handler }); },
  head: fakeEl(),
  body: fakeEl(),
  createElement: fakeEl,
  querySelector() { return fakeEl(); },
  querySelectorAll() { return []; },
  getElementById() { return fakeEl(); }
};
const window = {
  location: { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost' },
  trustedTypes: null,
  addEventListener() {},
  screen: { width: 1920, height: 1080 },
  FoxBearFirebase: null,
  crypto: { randomUUID() { return 'test-id'; } }
};
const context = vm.createContext({
  console,
  window,
  document,
  URL,
  Set,
  Map,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Date,
  Promise,
  clearTimeout,
  setTimeout,
  Blob: function Blob() {},
  Worker: function Worker() {},
  location: window.location,
  performance: { now: () => 0 },
  requestAnimationFrame: handler => handler()
});
[
  'src/config/mastering-presets.js',
  'src/config/genre-presets.js',
  'src/config/reference-targets.js',
  'src/state/app-state.js',
  'src/utils/core-utils.js',
  'src/recommendation/recommendation-engine.js',
  'src/app.js'
].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));

context.analysis = {
  silence: false,
  brightness: 0.55,
  stereoWidth: 0.45,
  crest: 6,
  loudnessHint: -14,
  metallicHint: 0.4,
  bassRatio: 0.25,
  lowMidRatio: 0.25,
  midRatio: 0.3,
  highRatio: 0.2,
  transientDensity: 0.35,
  spectrumBands: { sub: 0.05, presence: 0.12, air: 0.06 },
  spectralCentroidHz: 2500,
  spectralRolloffHz: 9000,
  spatialExcessRisk: 0.1,
  mobileSpeakerRisk: 0.1,
  peakDb: -3
};
const recommendation = vm.runInContext('recommendPreset("song.wav", analysis)', context);
if (!recommendation || !recommendation.preset || recommendation.preset === 'custom') {
  throw new Error(`recommendPreset returned invalid preset: ${JSON.stringify(recommendation)}`);
}
context.recommendation = recommendation;
const candidates = vm.runInContext('getAiCandidatePresets({ analysis, recommendedPreset: recommendation.preset, preset: recommendation.preset, confidence: recommendation.confidence, genreAlternatives: recommendation.alternatives })', context);
if (!Array.isArray(candidates) || !candidates.length || candidates[0].preset === 'custom') {
  throw new Error(`AI candidates should start with a real recommendation: ${JSON.stringify(candidates)}`);
}
const originalBeforeManual = vm.runInContext('getOriginalSelectionCandidate({ preset: "custom", originalManualSelected: false, genreLocked: false })', context);
if (originalBeforeManual.active) {
  throw new Error('Original selection should not be active before the user manually chooses it.');
}
const safe = vm.runInContext('safeRecommendPreset("song.wav", analysis, "smoke")', context);
if (!safe || !safe.preset || safe.preset === 'custom') {
  throw new Error(`safeRecommendPreset failed: ${JSON.stringify(safe)}`);
}
console.log(`PASS recommendation popup smoke: ${recommendation.preset} ${recommendation.confidence}%`);
