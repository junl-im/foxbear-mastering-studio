#!/usr/bin/env node
'use strict';

const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const view = fs.readFileSync('src/ui/waveform-compare-view.js', 'utf8');
const css = fs.readFileSync('assets/css/waveform-compare.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const viewScript = 'src/ui/waveform-compare-view.js';
const appScript = 'src/app.js';
assert(index.includes(viewScript), 'waveform compare view script is not loaded');
assert(index.indexOf(viewScript) < index.indexOf(appScript), 'waveform compare view must load before app.js');
assert(index.includes('assets/css/waveform-compare.css'), 'waveform compare CSS is not loaded');
assert(index.indexOf('assets/css/dock.css') < index.indexOf('assets/css/waveform-compare.css'), 'compare CSS should load after dock.css as the dedicated compare layer');

assert(view.includes('global.FoxBearWaveformCompareView'), 'extracted view does not expose FoxBearWaveformCompareView');
assert(view.includes('createRenderer(deps = {})'), 'view does not use dependency injection renderer');
assert(view.includes('sliceWaveformValuesByTime'), 'view is missing aligned slicing helper');
assert(view.includes('createWaveformCompareTransportControls'), 'view is missing popup transport controls');
assert(app.includes('compareView.renderWaveformCompareDialog(track, target'), 'app.js does not call extracted compare renderer');
assert(!app.includes('function createAlignedWaveformCompareRows'), 'app.js still owns aligned row builder');
assert(!app.includes('function createWaveformCompareTransportControls'), 'app.js still owns compare transport builder');

assert(css.includes('FoxBear Stage7 waveform compare popup layer'), 'dedicated compare CSS banner is missing');
assert(css.includes('.waveform-compare-transport'), 'compare transport CSS is missing');
assert(css.includes('.waveform-compare-bars.has-live-playhead::before'), 'compare playhead cap CSS is missing');
assert(sw.includes('./src/ui/waveform-compare-view.js?v=1.6.103-ci-hygiene-mail-routing-hardening'), 'service worker does not precache compare view module');
assert(sw.includes('./assets/css/waveform-compare.css?v=1.6.103-ci-hygiene-mail-routing-hardening'), 'service worker does not precache compare CSS');

console.log('PASS waveform compare stage6 module smoke');
