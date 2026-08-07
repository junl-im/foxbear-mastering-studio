#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const pkg = JSON.parse(read('package.json'));
const dialog = read('src/ui/download-dialog-view.js');
const css = read('assets/css/download-dialog.css');
const service = read('src/download/download-service.js');
const index = read('index.html');

assert(/^1\.6\.(?:1[3-9]|[2-9]\d)$/.test(pkg.version), 'package version should preserve the v1.6.73+ menu contract');
assert(dialog.includes("formatPicker.append(familyTabs)"), 'only the MP3/WAV family row should remain permanently visible');
assert(dialog.includes("qualityMenu.className = 'download-format-quality-menu download-format-quality-menu-portal'"), 'context-style quality menu container missing');
assert(dialog.includes("qualityMenu.hidden = true"), 'quality menu must start closed');
assert(dialog.includes("button.setAttribute('aria-haspopup', 'menu')"), 'format family buttons must expose menu semantics');
assert(dialog.includes("button.setAttribute('role', 'menuitemradio')"), 'quality choices must expose single-select menu semantics');
assert(dialog.includes("if (qualityMenuOpen && activeFormatFamily === family.id)"), 'repeated family click should toggle the quality menu');
assert(dialog.includes("closeQualityMenu({ restoreFocus: true })"), 'selection and Escape must close the quality menu and restore focus');
assert(dialog.includes("event.key === 'ArrowDown'") && dialog.includes("event.key === 'ArrowUp'"), 'quality menu keyboard navigation missing');
assert(dialog.includes("MP3 또는 WAV를 누르면 음질 선택 메뉴가 열립니다."), 'new compact download instruction missing');
assert(css.includes('.download-format-quality-menu {') && css.includes('position: fixed;'), 'quality menu floating layout missing');
assert(dialog.includes('qualityMenu.dataset.anchorFamily = family.id') && css.includes('.download-format-quality-menu[data-anchor-family="wav"]'), 'MP3/WAV anchored menu placement missing');
assert(css.includes('grid-template-columns: 1fr;'), 'context quality choices must render as a vertical list');
assert(css.includes("content: '✓';"), 'selected quality checkmark missing');
assert(service.includes("{ format: 'mp3_128'") && service.includes("{ format: 'mp3_320'"), 'MP3 quality range missing');
assert(service.includes("{ format: 'wav16'") && service.includes("{ format: 'wav32float'"), 'WAV quality range missing');
assert(index.includes(`src/ui/download-dialog-view.js?v=${pkg.foxbearRelease.assetVersion}`), 'download dialog asset version was not synchronized');
assert(index.includes(`assets/css/download-dialog.css?v=${pkg.foxbearRelease.assetVersion}`), 'download dialog CSS version was not synchronized');

console.log('PASS v1.6.13 MP3/WAV context-style quality menu smoke');
