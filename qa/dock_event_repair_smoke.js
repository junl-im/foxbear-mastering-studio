#!/usr/bin/env node
const fs = require('fs');
const app = fs.readFileSync('src/app.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const studioCss = fs.readFileSync('assets/css/studio.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const sw = fs.readFileSync('sw.js', 'utf8');
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}
must(app.includes("const APP_VERSION = 'Pro v1.3.83'"), 'app version should be v1.3.83');
must(html.includes('data-build="1.3.83"'), 'index build should be v1.3.83');
must(pkg.version === '1.3.83', 'package version should be v1.3.83');
must(sw.includes('foxbear-shell-v1.3.83-pc-dock-modal-hardfix'), 'SW cache key should be v1.3.83');
must(html.includes('src/app.js?v=1.3.83-pc-dock-modal-hardfix'), 'app cache-bust key should be v1.3.83');
must(app.includes('#bottomPreviewOriginalBtn, #bottomPreviewMasteredBtn, [data-preview-translation-mode], #previewDialogClose'), 'single Dock dispatcher should cover source, translation, and close controls');
must(app.includes("runDockRemoteSourceMode('original', event)"), 'original tab should use Dock source dispatcher');
must(app.includes("runDockRemoteSourceMode('mastered', event)"), 'mastered tab should use Dock source dispatcher');
must(app.includes('function runDockRemoteTranslationMode'), 'translation mode dispatcher should exist');
must(app.includes('applyPreviewTranslationMode(mode, { keepPlaying: true, toast: true, track })'), 'translation mode should target active Dock track');
must(app.includes('function runDockRemoteSourceMode'), 'source mode dispatcher should exist');
must(app.includes('closePreviewDialog();\n                return;'), 'preview dialog close should be handled in capture dispatcher');
must(app.includes("showToast('비교할 음원을 먼저 불러와주세요.');"), 'waveform popup should use active Dock/main track with feedback');
must(studioCss.includes('v1.3.83 PC Dock / Modal Hard Fix') || studioCss.includes('v1.3.83 Dock integrated waveform remote'), 'studio css should include integrated waveform section');
must(dockCss.includes('.bottom-preview-translation-btn') && dockCss.includes('pointer-events: auto !important'), 'translation buttons should be pointer-enabled');
must(dockCss.includes('.preview-dialog-backdrop.show.waveform-compare-mode') && dockCss.includes('z-index: 28000'), 'waveform dialog should sit above Dock and be clickable');
console.log('PASS Dock integrated waveform remote smoke');
