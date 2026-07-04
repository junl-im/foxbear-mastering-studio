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
const document = {
  baseURI: 'http://localhost/index.html',
  addEventListener() {},
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
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const result = vm.runInContext(`(() => {
  const analysis = {
    brightness: 0.72,
    metallicHint: 0.62,
    bassRatio: 0.46,
    lowMidRatio: 0.28,
    midRatio: 0.31,
    highRatio: 0.34,
    presenceRatio: 0.28,
    airRatio: 0.15,
    transientDensity: 0.46,
    stereoWidth: 0.55,
    spatialExcessRisk: 0.28,
    lowMonoScore: 74,
    mobileSpeakerRisk: 0.58,
    spectrumProfile: new Array(24).fill(0.04)
  };
  const base = cloneSettings(GENRE_PRESETS.pop);
  state.masterGoal = 'natural';
  state.masterStyle = 'streaming';

  state.masterStrength = 'balanced';
  const balanced = createSharedDspProfile(base, analysis, 'pop', { mode: 'strength-smoke' });

  state.masterStrength = 'vocal_safe';
  const vocal = createSharedDspProfile(base, analysis, 'pop', { mode: 'strength-smoke' });
  if (!(vocal.effectiveSettings.clarity <= balanced.effectiveSettings.clarity)) throw new Error('Vocal Safe should not raise clarity');
  if (!(vocal.effectiveSettings.metallicRemoval >= balanced.effectiveSettings.metallicRemoval)) throw new Error('Vocal Safe should raise metallic removal');
  if (!(vocal.effectiveSettings.stereoGroove <= balanced.effectiveSettings.stereoGroove)) throw new Error('Vocal Safe should reduce stereo groove');

  state.masterStrength = 'mobile_safe';
  const mobile = createSharedDspProfile(base, analysis, 'pop', { mode: 'strength-smoke' });
  if (!(mobile.effectiveSettings.warmth <= balanced.effectiveSettings.warmth)) throw new Error('Mobile Safe should reduce warmth/boom risk');
  if (!(mobile.effectiveSettings.dynamicPunch <= balanced.effectiveSettings.dynamicPunch)) throw new Error('Mobile Safe should reduce punch density');

  state.masterStrength = 'loud';
  const loud = createSharedDspProfile(base, analysis, 'pop', { mode: 'strength-smoke' });
  if (!(loud.effectiveSettings.intensity >= balanced.effectiveSettings.intensity)) throw new Error('Loud should raise intensity unless safety caps prevent it');
  if (loud.summary.masterStrength !== 'loud') throw new Error('Shared DSP summary should record strength profile');

  return {
    balancedIntensity: balanced.effectiveSettings.intensity,
    vocalMetallic: vocal.effectiveSettings.metallicRemoval,
    mobileWarmth: mobile.effectiveSettings.warmth,
    loudIntensity: loud.effectiveSettings.intensity
  };
})()`, context);
console.log(`PASS strength profiles smoke: balanced=${result.balancedIntensity}, vocalMetallic=${result.vocalMetallic}, mobileWarmth=${result.mobileWarmth}, loud=${result.loudIntensity}`);
