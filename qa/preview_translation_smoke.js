#!/usr/bin/env node
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const state = fs.readFileSync('src/state/app-state.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
const htmlTokens = [
  'bottomPreviewTranslationModes',
  'data-preview-translation-mode="studio"',
  'data-preview-translation-mode="phone"',
  'data-preview-translation-mode="laptop"',
  'data-preview-translation-mode="mono"'
];
for (const token of htmlTokens) {
  if (!html.includes(token)) throw new Error(`missing html token: ${token}`);
}
const appTokens = [
  'PREVIEW_TRANSLATION_MODES',
  'setupPreviewTranslationAudio',
  'createPreviewTranslationFilterChain',
  'connectPreviewMonoMatrix',
  'handlePreviewTranslationModeClick',
  'previewTranslationMode'
];
for (const token of appTokens) {
  if (!app.includes(token)) throw new Error(`missing app token: ${token}`);
}
if (!state.includes("previewTranslationMode: 'studio'")) throw new Error('preview translation state default missing');
for (const token of ['bottom-preview-translation-modes', 'bottom-preview-translation-btn', 'bottom-preview-translation-hint']) {
  if (!css.includes(token)) throw new Error(`missing css token: ${token}`);
}
console.log('PASS preview translation smoke: phone/laptop/mono controls and audio routing hooks present');
