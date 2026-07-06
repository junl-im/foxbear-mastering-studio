#!/usr/bin/env node
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
const compareCss = fs.readFileSync('assets/css/waveform-compare.css', 'utf8');
const requiredHtml = [
  'bottomPreviewWaveformBtn',
  '마스터링',
  '하이라이트',
  '원곡',
  '마스터'
];
for (const token of requiredHtml) {
  if (!html.includes(token)) throw new Error(`missing html token: ${token}`);
}
const order = ['bottomPreviewMasterPreviewBtn', 'bottomPreviewMasterBtn', 'bottomPreviewOriginalBtn', 'bottomPreviewMasteredBtn'];
const positions = order.map(token => html.indexOf(token));
if (positions.some(pos => pos < 0)) throw new Error('dock control order token missing');
for (let i = 1; i < positions.length; i += 1) {
  if (positions[i] <= positions[i - 1]) throw new Error('dock controls are not in requested order');
}
for (const token of ['renderBottomWaveformMini', 'openWaveformCompareDialog', 'DOCK_WAVEFORM_BINS']) {
  if (!app.includes(token)) throw new Error(`missing app token: ${token}`);
}
for (const token of ['bottom-preview-waveform', 'calc(var(--bottom-preview-height']) {
  if (!css.includes(token)) throw new Error(`missing css token: ${token}`);
}
if (!compareCss.includes('waveform-compare-mode')) throw new Error('missing compare css token: waveform-compare-mode');
console.log('PASS dock waveform smoke: mini view, popup, order, compact controls present');
