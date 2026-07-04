const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = [
  'src/config/mastering-presets.js',
  'src/config/genre-presets.js',
  'src/config/reference-targets.js',
  'src/state/app-state.js',
  'src/utils/core-utils.js',
  'src/app.js'
];
const listeners = [];
const document = {
  baseURI: 'http://localhost/index.html',
  addEventListener(type, handler) { listeners.push({ type, handlerType: typeof handler }); },
  head: { textContent: '', append() {} },
  body: { textContent: '', className: '', classList: { add(){}, remove(){}, contains(){ return false; } } },
  createElement(tag) {
    return {
      tagName: tag,
      setAttribute(){}, append(){}, addEventListener(){}, removeEventListener(){},
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      className:'', textContent:'', style:{}, dataset:{}, classList:{ add(){}, remove(){}, contains(){ return false; } },
      rel:'', href:'', name:'', content:'', value:'', disabled:false
    };
  },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};
const window = {
  location: { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost' },
  trustedTypes: null,
  addEventListener() {},
  screen: { width: 1920, height: 1080 },
  FoxBearFirebase: null
};
const context = vm.createContext({
  console, window, document, URL, Set, Map, Math, Number, String, Boolean, Array, Object, Date, Promise,
  clearTimeout, setTimeout, Blob: function(){}, Worker: function(){}, location: window.location
});
for (const file of files) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}
const result = vm.runInContext(`(() => {
  const analysis = {
    brightness: 0.61,
    metallicHint: 0.32,
    bassRatio: 0.31,
    lowMidRatio: 0.22,
    midRatio: 0.27,
    highRatio: 0.20,
    presenceRatio: 0.18,
    airRatio: 0.09,
    transientDensity: 0.44,
    stereoWidth: 0.42,
    spatialExcessRisk: 0.12,
    lowMonoScore: 88,
    mobileSpeakerRisk: 0.18,
    spectrumBands: { low: 0.31, lowMid: 0.22, mid: 0.27, high: 0.20, presence: 0.18, air: 0.09 }
  };
  const profile = createSharedDspProfile(GENRE_PRESETS.pop, analysis, 'pop', { mode: 'smoke', minWidthFactor: 0.82, maxWidthFactor: 1.22 });
  if (!profile || profile.version !== SHARED_DSP_PROFILE_VERSION) throw new Error('missing shared profile version');
  if (!profile.effectiveSettings || !profile.realtime || !profile.spatialBudget || !profile.finalizerAnalysis) throw new Error('incomplete shared DSP profile');
  if (!Number.isFinite(profile.realtime.presence.gain)) throw new Error('invalid realtime presence gain');
  if (!Number.isFinite(profile.spatialBudget.widthFactor)) throw new Error('invalid spatial budget');
  markSharedDspProfileApplied(analysis, profile);
  if (!analysis.sharedDspProfileApplied || analysis.sharedDspProfileApplied.version !== SHARED_DSP_PROFILE_VERSION) throw new Error('profile was not marked on analysis');
  const finalizerSummary = getSharedDspSummaryForReport(profile.summary);
  if (!finalizerSummary || finalizerSummary.version !== SHARED_DSP_PROFILE_VERSION) throw new Error('report summary failed');
  return { version: profile.version, widthFactor: profile.spatialBudget.widthFactor, highShelfDb: profile.realtime.highShelf.gain };
})()`, context);
console.log(`PASS shared DSP profile smoke: ${result.version}, widthFactor=${result.widthFactor.toFixed(3)}, highShelf=${result.highShelfDb.toFixed(2)}dB`);
