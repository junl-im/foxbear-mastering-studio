#!/usr/bin/env node
'use strict';

const fs = require('fs');

const app = fs.readFileSync('src/app.js', 'utf8');
const view = fs.readFileSync('src/ui/waveform-compare-view.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const dockWaveformCss = fs.readFileSync('assets/css/dock-waveform.css', 'utf8');
const compareCss = fs.readFileSync('assets/css/waveform-compare.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

assert(app.includes('FoxBearWaveformCompareView'), 'app does not delegate compare popup rendering to extracted view');
assert(view.includes('function createAlignedWaveformCompareRows'), 'aligned waveform compare row builder is missing from extracted view');
assert(view.includes('sliceWaveformValuesByTime(original, originalDuration, compareWindow.startSec, compareWindow.durationSec, popupBins)'), 'original highlight waveform is not sliced to the resolved compare window');
assert(app.includes("scope: bars?.dataset?.waveformScope || 'full'"), 'waveform seek handlers do not pass row scope');
assert(view.includes('function createWaveformCompareTransportControls'), 'compare popup transport controls are missing');
assert(view.includes("bars.dataset.waveformAligned = options.aligned ? 'true' : 'false'"), 'aligned waveform dataset flag is missing');

assert(compareCss.includes('Stage7 waveform compare popup layer'), 'stage7 compare CSS layer is missing');
assert(/waveform-compare-row[\s\S]*grid-template-columns:\s*var\(--waveform-compare-label-width\) minmax\(0, 1fr\) var\(--waveform-compare-action-width\)/.test(compareCss), 'compare rows do not use fixed label/action columns');
assert(/waveform-compare-bars\.has-live-playhead::after[\s\S]*width:\s*1px !important/.test(compareCss), 'compare live playhead was not slimmed to 1px');
assert(/has-live-playhead::after[\s\S]*width:\s*1px !important/.test(dockWaveformCss), 'dock live playhead was not slimmed to 1px');
assert(dockCss.includes('text-align: left !important;'), 'mobile left alignment repair is missing');
assert(/stage(?:[789]|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28)/.test(sw) || sw.includes('foxbear-shell-v1.6.112-mastering-lifecycle-race-hardening'), 'service worker cache name should be bumped for recent stage');

console.log('PASS waveform compare stage5 smoke');
