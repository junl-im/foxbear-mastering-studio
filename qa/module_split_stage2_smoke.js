const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({
  console,
  window: {},
  globalThis: {},
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object
});
context.globalThis = context.window;
vm.runInContext(fs.readFileSync(path.join(root, 'src/utils/core-utils.js'), 'utf8'), context, { filename: 'src/utils/core-utils.js' });
const utils = context.window.FoxBearCoreUtils;
if (!utils) throw new Error('FoxBearCoreUtils was not registered');
for (const name of ['clamp', 'clamp01', 'map', 'dbToAmp', 'median', 'normalizeWaveformValues', 'sampleMarkersFromValues', 'createWaveformOverview', 'sampleWaveformOverview', 'samplePeakMarkers']) {
  if (typeof utils[name] !== 'function') throw new Error(`Missing utility export: ${name}`);
}
if (utils.clamp(12, 0, 10) !== 10) throw new Error('clamp behavior failed');
if (utils.clamp01(1.8) !== 1) throw new Error('clamp01 behavior failed');
if (Math.abs(utils.dbToAmp(6) - 1.9952623149688795) > 1e-9) throw new Error('dbToAmp behavior failed');
const normalized = utils.normalizeWaveformValues([0, 0.5, 1], 6);
if (!Array.isArray(normalized) || normalized.length !== 8 || Math.max(...normalized) > 1.000001) {
  throw new Error('normalizeWaveformValues behavior failed');
}
const appCode = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
for (const name of ['clamp', 'clamp01', 'map', 'dbToAmp', 'median', 'normalizeWaveformValues', 'sampleMarkersFromValues', 'createWaveformOverview', 'sampleWaveformOverview', 'samplePeakMarkers']) {
  if (new RegExp(`function\\s+${name}\\s*\\(`).test(appCode)) {
    throw new Error(`Utility function still declared in app.js: ${name}`);
  }
}
const hannMatches = appCode.match(/function\s+makeHannWindow\s*\(/g) || [];
if (hannMatches.length !== 1) throw new Error(`Expected one makeHannWindow declaration, found ${hannMatches.length}`);
console.log('PASS module split stage 2 smoke: shared utilities load and app.js no longer redeclares them');
