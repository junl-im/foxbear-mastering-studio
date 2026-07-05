#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const dockCss = fs.readFileSync(path.join(root, 'assets/css/dock.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];
function expect(condition, message) { if (!condition) failures.push(message); }

expect(index.includes('v1.3.72'), 'index should show v1.3.72');
expect(index.includes('1.3.72-dock-remote-controller'), 'index asset query should use v1.3.72 cache key');
expect(pkg.version === '1.3.72', 'package version should be 1.3.72');
expect(app.includes("const APP_VERSION = 'Pro v1.3.72'"), 'app version constant should be v1.3.72');
expect(app.includes('Dock mini peak is a popup opener'), 'Dock mini waveform should document popup-only behavior');
expect(!/attachWaveformSeekHandlers\(bars,\s*mode,\s*['"]dock['"]\)/.test(app), 'Dock mini waveform bars must not bind seek handlers');
expect(/function onBottomWaveformButtonClick\(event\)\s*{\s*event\?\.preventDefault\?\.\(\);\s*openWaveformCompareDialog\(\);\s*}/s.test(app), 'Dock waveform click should always open compare popup');
expect(app.includes("target.classList.add('foxbear-toast-stack', 'show')"), 'showToast should enable stack container');
expect(app.includes("document.createElement('div')") && app.includes("item.className = 'foxbear-toast-item'"), 'showToast should create stacked toast items');
expect(dockCss.includes('Dock remote controller'), 'dock css should include v1.3.72 section');
expect(/\.bottom-preview-waveform\s*{[\s\S]*grid-template-columns:\s*38px minmax\(96px, 1fr\) 58px !important/.test(dockCss), 'Dock waveform should use aligned 3-column grid');
expect(/\.bottom-preview-player \.custom-player,[\s\S]*grid-template-columns:\s*38px minmax\(96px, 1fr\) 58px !important/.test(dockCss), 'Dock player should share aligned 3-column grid');
expect(/\.bottom-preview-controls\s*{[\s\S]*order:\s*3 !important/.test(dockCss), 'Action row should be above translation row');
expect(/\.bottom-preview-translation-modes\s*{[\s\S]*order:\s*4 !important/.test(dockCss), 'Translation row should move below action row');
expect(dockCss.includes('.toast.foxbear-toast-stack') && dockCss.includes('flex-direction: column-reverse'), 'Stacked toast CSS should be present and stack upward');
expect(dockCss.includes('body.bottom-preview-active .toast.foxbear-toast-stack'), 'Toast should anchor above active Dock');

if (failures.length) {
  console.error('FAIL dock peak/toast stack smoke');
  failures.forEach(f => console.error('-', f));
  process.exit(1);
}
console.log('PASS dock peak/toast stack smoke');
