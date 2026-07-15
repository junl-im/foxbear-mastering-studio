#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage28_waveform_control_view_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.5.10-header-settings-relocation';
const index = read('index.html');
const sw = read('sw.js');
const pkg = read('package.json');
const runtime = read('src/boot/runtime-health.js');
const app = read('src/app.js');
const compare = read('src/ui/waveform-compare-view.js');
const view = read('src/ui/waveform-control-view.js');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(index.includes(`src/ui/waveform-control-view.js?v=${version}`), 'index should load waveform-control-view with current cache key');
assert(sw.includes(`./src/ui/waveform-control-view.js?v=${version}`), 'service worker should precache waveform-control-view');
assert(sw.includes(`foxbear-shell-v${version}`), 'service worker cache should use Stage28 key');
assert(pkg.includes('node --check src/ui/waveform-control-view.js'), 'package should syntax-check waveform-control-view');
assert(pkg.includes('node qa/stage28_waveform_control_view_smoke.js'), 'package should run Stage28 smoke');
assert(runtime.includes('FoxBearWaveformControlView.createBars'), 'runtime health should require waveform view');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite default should be Stage28');

const serviceIndex = index.indexOf('src/audio/waveform-control-service.js');
const viewIndex = index.indexOf('src/ui/waveform-control-view.js');
const compareIndex = index.indexOf('src/ui/waveform-compare-view.js');
const appIndex = index.indexOf('src/app.js');
assert(serviceIndex > -1 && viewIndex > serviceIndex, 'waveform view should load after waveform control service');
assert(compareIndex > viewIndex, 'compare view should load after waveform view');
assert(appIndex > viewIndex, 'app should load after waveform view');

[
  'FoxBearWaveformControlView',
  'createBars',
  'createRow',
  'makePlaceholderValues',
  'stampManagedElement',
  'dataset.waveformView'
].forEach(token => assert(view.includes(token), `view module should include ${token}`));

assert(app.includes('function createManagedWaveformBars'), 'app should use a managed waveform creation gateway');
assert(app.includes('createManagedWaveformBars({'), 'app waveform surfaces should call the managed gateway');
assert(app.includes('view.createRow'), 'detail waveform row should delegate to waveform view');
assert(app.includes("setPlayheadOnElement(originalWaveformRow.querySelector('.ab-switch-inline-waveform-bars'), pct * 100"), 'A/B original playhead should use percent scale');
assert(app.includes("setPlayheadOnElement(masteredWaveformRow.querySelector('.ab-switch-inline-waveform-bars'), pct * 100"), 'A/B mastered playhead should use percent scale');
assert(compare.includes('global.FoxBearWaveformControlView'), 'compare popup should use waveform control view');
assert(compare.includes("service?.stampManagedElement?.(bars, 'popup')"), 'compare popup bars should be stamped as managed');

const unmanagedPatterns = [
  "bars.className = 'dock-integrated-waveform-bars",
  "bars.className = 'ab-switch-inline-waveform-bars",
  "bars.className = 'waveform-bars'",
  "bars.className = 'waveform-compare-bars'"
];
for (const pattern of unmanagedPatterns) {
  assert(!app.includes(pattern), `app should not create unmanaged ${pattern}`);
  assert(!compare.includes(pattern), `compare view should not create unmanaged ${pattern}`);
}

assert(handoff.includes('Stage28') && handoff.includes('waveform-control-view.js'), 'handoff should include Stage28 view extraction');
assert(notes.includes('Stage28') && notes.includes('unmanaged waveform audit'), 'project notes should mention Stage28 audit');

console.log('PASS stage28 waveform control view smoke');
