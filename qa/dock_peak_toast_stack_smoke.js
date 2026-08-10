#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const studioCss = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
const dockCss = fs.readFileSync(path.join(root, 'assets/css/dock.css'), 'utf8');
const compareCss = fs.readFileSync(path.join(root, 'assets/css/waveform-compare.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];
function expect(condition, message) { if (!condition) failures.push(message); }

expect(index.includes('v1.6.84'), 'index should show v1.6.84');
expect(index.includes('1.6.84-tracked-windows-cleanup-static-gate-recovery'), 'index asset query should use stage12.2 cache-bust key');
expect(pkg.version === '1.6.84', 'package version should be 1.6.84');
expect(app.includes("const APP_VERSION = 'Pro v1.6.84'"), 'app version constant should be v1.4.0');
expect(app.includes('function createDockIntegratedWaveformPlayer'), 'Dock should use integrated waveform player');
expect(app.includes("attachWaveformSeekHandlers(bars, targetMode, role)"), 'Dock integrated waveform should bind seek handlers');
expect(/function onBottomWaveformButtonClick\(event\)\s*{\s*event\?\.preventDefault\?\.\(\);\s*event\?\.stopPropagation\?\.\(\);\s*openWaveformCompareDialog\(\);\s*}/s.test(app), 'Dock compare button should always open compare popup');
expect(app.includes("target.classList.add('foxbear-toast-stack', 'show')"), 'showToast should enable stack container');
expect(app.includes("document.createElement('div')") && app.includes("item.className = 'foxbear-toast-item'"), 'showToast should create stacked toast items');
expect(studioCss.includes('v1.4.0 Dock / Modal State Machine Refactor') || studioCss.includes('v1.4.0 Dock integrated waveform remote'), 'studio CSS should include v1.4.0 section');
expect(studioCss.includes('.dock-integrated-waveform-bars'), 'Integrated waveform CSS should be present');
expect(compareCss.includes('.waveform-compare-listen'), 'Large compare listen buttons should be styled in dedicated compare CSS');
expect(dockCss.includes('body.bottom-preview-active .toast.foxbear-toast-stack') || dockCss.includes('.toast.foxbear-toast-stack'), 'Stacked toast CSS should remain present');

if (failures.length) {
  console.error('FAIL dock peak/toast stack smoke');
  failures.forEach(f => console.error('-', f));
  process.exit(1);
}
console.log('PASS dock peak/toast stack smoke');
