#!/usr/bin/env node
const fs = require('fs');
const app = fs.readFileSync('src/app.js', 'utf8');
const view = fs.readFileSync('src/ui/waveform-compare-view.js', 'utf8');
const compareCss = fs.readFileSync('assets/css/waveform-compare.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

must(app.includes("const APP_VERSION = 'Pro v1.6.43'"), 'v1.4.0 app version missing');
must(html.includes('data-build="1.6.43"'), 'v1.4.0 build marker missing');
must(html.includes('bottom-preview-compare-open'), 'Dock big compare opener missing');
must(html.includes('하이라이트'), 'Highlight listen label missing');
must(html.includes('마스터링'), 'Mastering start label missing');
must(html.indexOf('bottomPreviewMasterPreviewBtn') < html.indexOf('bottomPreviewMasterBtn'), 'Highlight should sit before mastering start');
must(app.includes('function createDockIntegratedWaveformPlayer'), 'Integrated Dock player factory missing');
must(app.includes('function makeDockWaveformBars'), 'Integrated Dock waveform bars missing');
must(app.includes("attachWaveformSeekHandlers(bars, targetMode, role)"), 'Dock waveform seek binding missing');
must(view.includes('waveform-compare-listen'), 'Large compare listen buttons missing');
must(view.includes("listen.textContent = mode === 'mastered' ? '마스터링 듣기'"), 'Large compare source listen labels missing');
must(app.includes('installFeatureDialogFallback'), 'Feature button fallback missing');
must(css.includes('dock-integrated-player'), 'Integrated player CSS missing');
must(css.includes('waveform-compare-listen') || compareCss.includes('waveform-compare-listen'), 'Large compare listen CSS missing');
must(css.includes('grid-template-columns: minmax(112px, max-content) minmax(132px, 180px) minmax(0, 1fr)'), 'Requested action layout CSS missing');
console.log('PASS dock integrated waveform remote smoke');
