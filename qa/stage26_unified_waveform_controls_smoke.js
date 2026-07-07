#!/usr/bin/env node
const fs = require('fs');
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage26_unified_waveform_controls_smoke: ${message}`);
    process.exit(1);
  }
}
const app = fs.readFileSync('src/app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const previewCss = fs.readFileSync('assets/css/components/preview-system.css', 'utf8');
const cardsCss = fs.readFileSync('assets/css/components/cards.css', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');
const overwrite = fs.readFileSync('tools/create-overwrite-zip.sh', 'utf8');
const version = '1.4.5-stability-audit';
assert(index.includes(version), 'index should use Stage26 asset key');
assert(sw.includes(`foxbear-shell-v${version}`) || sw.includes(`foxbear-shell-${version}`), 'service worker should use Stage26 cache key');
assert(pkg.includes('node qa/stage26_unified_waveform_controls_smoke.js'), 'package should run Stage26 smoke');
assert(overwrite.includes('v1.4.5'), 'overwrite default should be Stage26');
assert(app.includes('renderPreviewDialogUnifiedPlayers(track, el.previewDialogBody)'), 'preview dialog should use unified player renderer');
assert(app.includes('function renderPreviewDialogUnifiedPlayers'), 'unified preview dialog renderer missing');
assert(!app.includes("renderPreviewPlayers(track, el.previewDialogBody, { vertical: true })"), 'preview dialog should not render legacy bottom preview grid');
assert(app.includes("source.textContent = options.sourceLabel || getDockModeLabel(mode)"), 'dock-integrated player should accept source labels');
assert(app.includes('dock-integrated-peak-jump'), 'dock-integrated player should expose peak jump control');
assert(app.includes('seekToStrongestPeak'), 'peak jump should seek strongest peak');
assert(app.includes('preview-dialog-mastered'), 'dialog mastered player should use unified player role');
assert(app.includes('ab-switch-inline-waveforms'), 'A/B deck should include inline waveform controls');
assert(app.includes('createInlineWaveformRow'), 'A/B deck waveform rows should be generated');
assert(app.includes('setPlayheadOnElement(originalWaveformRow'), 'A/B waveform playhead sync missing');
assert(previewCss.includes('.preview-dialog-unified-player'), 'preview-system css should style unified dialog player');
assert(previewCss.includes('.dock-integrated-peak-jump'), 'preview-system css should style peak jump');
assert(cardsCss.includes('.ab-switch-inline-waveforms'), 'cards css should style A/B inline waveforms');
console.log('PASS stage26 unified waveform controls smoke');
