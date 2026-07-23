#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const css = read('assets/css/components/modal-close-system.css');
const app = read('src/app.js');
const modalController = read('src/ui/modal-controller.js');
const downloadDialog = read('src/ui/download-dialog-view.js');
const downloadService = read('src/download/download-service.js');
const mobileNative = read('src/ui/mobile-native-view.js');

assert.strictEqual(pkg.version, '1.5.80');
assert.strictEqual(pkg.foxbearRelease.assetVersion, '1.5.80-mobile-return-media-focus-recovery');
assert(index.includes('assets/css/components/modal-close-system.css?v=1.5.80-mobile-return-media-focus-recovery'));
assert(sw.includes('./assets/css/components/modal-close-system.css?v=1.5.80-mobile-return-media-focus-recovery'));
assert(index.indexOf('assets/css/components/modal-close-system.css') > index.indexOf('assets/css/header-command-bar.css'), 'modal close ownership stylesheet must load last');

for (const id of ['programInfoClose', 'featureDialogClose', 'previewDialogClose', 'adminStatsClose']) {
  const pattern = new RegExp(`id="${id}"[^>]+class="[^"]*foxbear-modal-close`);
  assert(pattern.test(index), `${id} must use the shared modal close class`);
}

for (const token of [
  '--foxbear-modal-close-size: 38px',
  'position: absolute !important',
  'place-items: center !important',
  '.foxbear-modal-close::before',
  '.foxbear-modal-close::after',
  '.foxbear-modal-close:focus-visible',
  '--foxbear-modal-close-size: 36px'
]) assert(css.includes(token), `shared close CSS missing ${token}`);

for (const source of [downloadDialog, downloadService, app, mobileNative]) {
  assert(source.includes('foxbear-modal-close'), 'dynamic close control must use shared styling');
}
assert(app.includes("close.className = 'select-popup-close foxbear-modal-close'"), 'select popup must expose a top-right close control');
assert(app.includes("event.stopImmediatePropagation();") && app.includes('closeAiRecommendationDialog(backdrop);'), 'AI recommendation dialog must own Escape dismissal');
assert(downloadDialog.includes("event.key !== 'Escape' || actionInFlight") && downloadDialog.includes('closeDownloadOptionsDialog(backdrop);'), 'download dialog must support safe Escape close');
assert(downloadService.includes("event.key !== 'Escape'") && downloadService.includes('closePanel();'), 'download assist must support Escape');
assert(app.includes('__foxbearReturnFocus') && downloadDialog.includes('__foxbearReturnFocus'), 'dynamic modal focus return must be preserved');
assert(modalController.includes("button.classList.add('foxbear-modal-close')"), 'registered modal closers must be normalized automatically');
assert(modalController.includes('.select-popup-backdrop.show') && modalController.includes('#downloadAssist.show'), 'managed modal Escape must defer to the top runtime popup');

console.log('PASS v1.5.57 modal close consistency smoke');
