#!/usr/bin/env node
'use strict';

const fs = require('fs');

const app = fs.readFileSync('src/app.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

assert(app.includes('function createAlignedWaveformCompareRows'), 'aligned waveform compare row builder is missing');
assert(app.includes('sliceWaveformValuesByTime(original, originalDuration, previewStart, previewDuration, popupBins)'), 'original highlight waveform is not sliced to the same preview window');
assert(app.includes("scope: bars?.dataset?.waveformScope || 'full'"), 'waveform seek handlers do not pass row scope');
assert(app.includes('function createWaveformCompareTransportControls'), 'compare popup transport controls are missing');
assert(app.includes("bars.dataset.waveformAligned = options.aligned ? 'true' : 'false'"), 'aligned waveform dataset flag is missing');

assert(dockCss.includes('v1.3.85 Waveform compare alignment'), 'stage5 dock CSS block is missing');
assert(/waveform-compare-row[\s\S]*grid-template-columns:\s*var\(--waveform-compare-label-width\) minmax\(0, 1fr\) var\(--waveform-compare-action-width\)/.test(dockCss), 'compare rows do not use fixed label/action columns');
assert(/has-live-playhead::after[\s\S]*width:\s*1px !important/.test(dockCss), 'live playhead was not slimmed to 1px');
assert(dockCss.includes('text-align: left !important;'), 'mobile left alignment repair is missing');
assert(sw.includes('stage5'), 'service worker cache name was not bumped for stage5');

console.log('PASS waveform compare stage5 smoke');
