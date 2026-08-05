#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL module split stage4 smoke: ${message}`);
    process.exit(1);
  }
}

const index = read('index.html');
const app = read('src/app.js');
const downloadDialogView = read('src/ui/download-dialog-view.js');
const themeCss = read('assets/css/theme.css');
const layoutCss = read('assets/css/layout.css');
const studioCss = read('assets/css/studio.css');
const sw = read('sw.js');

const themePos = index.indexOf('assets/css/theme.css');
const layoutPos = index.indexOf('assets/css/layout.css');
const studioPos = index.indexOf('assets/css/studio.css');
const downloadCssPos = index.indexOf('assets/css/download-dialog.css');
const downloadViewPos = index.indexOf('src/ui/download-dialog-view.js');
const appPos = index.indexOf('src/app.js');

assert(themePos > -1, 'theme.css is missing from index.html');
assert(layoutPos > -1, 'layout.css is missing from index.html');
assert(studioPos > -1, 'studio.css is missing from index.html');
assert(themePos < layoutPos && layoutPos < studioPos, 'theme/layout/studio CSS load order is wrong');
assert(studioPos < downloadCssPos, 'feature CSS overrides should load after studio.css');
assert(downloadViewPos > -1, 'download dialog view module is missing from index.html');
assert(downloadViewPos < appPos, 'download dialog view must load before app.js');

assert(downloadDialogView.includes('global.FoxBearDownloadDialogView'), 'download dialog global export missing');
assert(downloadDialogView.includes('download-options-panel-v3'), 'download dialog panel builder missing');
assert(downloadDialogView.includes('download-options-selected-summary'), 'selected format summary builder missing');
assert(downloadDialogView.includes('await shareDownloadFile(exported.blob, exported.fileName)'), 'share flow moved incorrectly');
assert(app.includes('window.FoxBearDownloadDialogView'), 'app.js wrapper does not consume download dialog view');
assert(!app.includes("panel.className = 'download-options-panel download-options-panel-v3'"), 'download dialog DOM builder still lives in app.js');

assert(themeCss.includes(':root') && themeCss.includes('--mint') && themeCss.includes('--radius-lg'), 'theme tokens not extracted');
assert(layoutCss.includes('.app-shell') && layoutCss.includes('.studio-grid') && layoutCss.includes('body::before'), 'layout shell not extracted');
assert(!studioCss.includes('--bg: #070711') && !studioCss.includes('--radius-lg: 28px'), 'base theme tokens still live in studio.css');
assert(!studioCss.includes('* { box-sizing: border-box; }'), 'global reset still lives in studio.css');
assert(studioCss.includes('.upload-stage'), 'studio.css should retain component styles');

[
  'assets/css/theme.css',
  'assets/css/layout.css',
  'src/ui/download-dialog-view.js'
].forEach(asset => {
  assert(sw.includes(`./${asset}?v=1.6.61-human-readable-download-filenames`), `${asset} missing from service worker CORE_ASSETS`);
});
assert(/stage(?:[4-9]|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28)/.test(sw) || sw.includes('foxbear-shell-v1.6.61-human-readable-download-filenames'), 'service worker cache name not bumped for stage4 or later');

const appLines = app.split(/\r?\n/).length;
assert(appLines < 14000, `app.js should be below 14000 lines after stage4 split, got ${appLines}`);

console.log('PASS module split stage4 smoke');
