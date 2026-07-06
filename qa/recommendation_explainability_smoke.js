const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
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
  disabled: false,
  title: ''
});
const document = {
  baseURI: 'http://localhost/index.html',
  addEventListener() {},
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
  brightness: 0.62,
  stereoWidth: 0.48,
  crest: 5.8,
  loudnessHint: -13,
  metallicHint: 0.52,
  bassRatio: 0.24,
  lowMidRatio: 0.25,
  midRatio: 0.30,
  highRatio: 0.22,
  transientDensity: 0.38,
  spectrumBands: { sub: 0.055, presence: 0.15, air: 0.07 },
  spectralCentroidHz: 3100,
  spectralRolloffHz: 9400,
  spatialExcessRisk: 0.12,
  mobileSpeakerRisk: 0.18,
  peakDb: -3.2
};
const recommendation = vm.runInContext('recommendPreset("vocal-pop.wav", analysis)', context);
if (!recommendation.explanation || !Array.isArray(recommendation.explanation.chips) || !recommendation.explanation.chips.length) {
  throw new Error('recommendation explanation chips missing');
}
if (!Array.isArray(recommendation.alternatives) || !recommendation.alternatives[0].reason) {
  throw new Error('candidate reasons missing');
}
context.track = {
  analysis: context.analysis,
  recommendedPreset: recommendation.preset,
  preset: recommendation.preset,
  confidence: recommendation.confidence,
  genreAlternatives: recommendation.alternatives,
  genreExplanation: recommendation.explanation
};
const explainability = vm.runInContext('buildRecommendationExplainability(track)', context);
if (!explainability.summary || !explainability.primarySignal || !explainability.chips.length) {
  throw new Error(`invalid explainability payload: ${JSON.stringify(explainability)}`);
}
const candidate = vm.runInContext('getAiCandidatePresets(track)[0]', context);
context.candidate = candidate;
const candidateText = vm.runInContext('buildCandidateExplainText(track, candidate)', context);
if (!candidateText || !candidateText.includes('최상위')) {
  throw new Error(`candidate explain text failed: ${candidateText}`);
}
const manualText = vm.runInContext('buildCandidateExplainText(track, getOriginalSelectionCandidate(track))', context);
if (!manualText.includes('원본선택') || !manualText.includes('직접 조절')) {
  throw new Error(`manual explain text failed: ${manualText}`);
}
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
for (const token of ['ai-recommend-explain-box', 'ai-recommend-preset-explain', 'ai-master-explain-chip']) {
  if (!css.includes(token)) throw new Error(`missing explainability CSS token: ${token}`);
}
console.log(`PASS recommendation explainability smoke: ${recommendation.preset} ${recommendation.confidence}% · ${explainability.primarySignal}`);
