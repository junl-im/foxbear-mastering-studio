#!/usr/bin/env node
const fs = require('fs');
const app = fs.readFileSync('src/app.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const compareCss = fs.readFileSync('assets/css/waveform-compare.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL dock_player_polish_smoke: ${message}`);
    process.exit(1);
  }
}
must(app.includes("const APP_VERSION = 'Pro v1.4.4'"), 'app version should be v1.4.0');
must(html.includes('data-build="1.4.4"'), 'index build should be v1.4.4');
must(app.includes('function setMasteringProgress') && app.includes('quantizeProgressStep'), '5 percent progress helpers missing');
must(app.includes('function syncDockWaveformPlayhead') && app.includes('has-live-playhead'), 'live waveform playhead sync missing');
must(dockCss.includes('v1.3.54 Dock Player Polish'), 'dock polish CSS block missing');
must(dockCss.includes('grid-template-columns: 34px minmax(78px, 1fr) 52px') && dockCss.includes('.bottom-preview-player .player-toggle'), 'compact dock transport grid missing');
must(compareCss.includes('waveform-compare-mode') && compareCss.includes('padding-bottom: calc(var(--bottom-preview-panel-bottom'), 'waveform popup dock-safe offset missing');
must(dockCss.includes('repeating-linear-gradient(90deg') && dockCss.includes('foxbearHudScan'), 'progress HUD tick/scan animation missing');
must(pkg.includes('dock_player_polish_smoke.js'), 'package check should include dock player polish smoke');
console.log('PASS dock player polish smoke');
