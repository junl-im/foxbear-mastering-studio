#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage19_highlight_diagnostics_smoke: ${message}`);
    process.exit(1);
  }
}

const index = read('index.html');
const sw = read('sw.js');
const pkg = read('package.json');
const app = read('src/app.js');
const view = read('src/ui/waveform-compare-view.js');
const inspector = read('src/audio/highlight-compare-inspector.js');
const compareCss = read('assets/css/waveform-compare.css');
const runtimeHealth = read('src/boot/runtime-health.js');
const overwrite = read('tools/create-overwrite-zip.sh');
const version = '1.5.91-cancellable-audio-pipeline-performance-guards';

assert(index.includes(`src/audio/highlight-compare-inspector.js?v=${version}`), 'highlight compare inspector should load from index');
assert(sw.includes(`./src/audio/highlight-compare-inspector.js?v=${version}`), 'service worker should precache highlight compare inspector');
assert(sw.includes(`foxbear-shell-v1.5.91-cancellable-audio-pipeline-performance-guards`), 'service worker cache should use Stage19 key');
assert(pkg.includes('node --check src/audio/highlight-compare-inspector.js'), 'package should syntax-check highlight compare inspector');
assert(pkg.includes('node qa/stage19_highlight_diagnostics_smoke.js'), 'package should run Stage19 smoke');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be Stage19');

assert(inspector.includes('FoxBearHighlightCompareInspector'), 'inspector global export missing');
assert(inspector.includes('resolveCompareWindow'), 'resolveCompareWindow missing');
assert(inspector.includes('compareWaveformEnergy'), 'compareWaveformEnergy missing');
assert(inspector.includes('formatWindowLabel'), 'formatWindowLabel missing');
assert(inspector.includes('originalLocalStartSec'), 'original local start should be explicit');
assert(inspector.includes('masterPreviewLocalStartSec: 0'), 'master preview local start should be zero');

assert(view.includes('highlightCompareInspector'), 'waveform compare view should consume inspector');
assert(view.includes('compareWindow.startSec') && view.includes('compareWindow.durationSec'), 'preview rows should use resolved compare window');
assert(view.includes('waveformLocalStartSec'), 'row dataset should expose local start');
assert(view.includes('waveformAbsoluteStartSec'), 'row dataset should expose absolute start');
assert(view.includes('createHighlightCompareDiagnostic'), 'diagnostic DOM builder missing');
assert(view.includes('원곡=') && view.includes('하이라이트=0s'), 'diagnostic text should explain original/master preview alignment');
assert(view.includes('originalStartSec: alignedStartSec'), 'transport metadata should preserve original absolute start');
assert(view.includes('masterPreviewStartSec'), 'transport metadata should preserve master preview local start');

assert(app.includes('highlightCompareInspector: window.FoxBearHighlightCompareInspector'), 'app should pass inspector into compare view');
assert(runtimeHealth.includes('FoxBearHighlightCompareInspector.resolveCompareWindow'), 'runtime health should require inspector global');
assert(compareCss.includes('Stage19 highlight compare diagnostics'), 'diagnostic CSS banner missing');
assert(compareCss.includes('.waveform-compare-diagnostic'), 'diagnostic CSS missing');
assert(index.includes(version) && sw.includes(version), 'Stage19 asset version should be consistent');

console.log('PASS stage19 highlight diagnostics smoke');
