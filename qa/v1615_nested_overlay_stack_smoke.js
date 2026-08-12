#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const controller = read('src/ui/modal-controller.js');
const app = read('src/app.js');
const downloadDialog = read('src/ui/download-dialog-view.js');
const downloadService = read('src/download/download-service.js');
const css = read('assets/css/components/floating-overlays.css');

assert.strictEqual(pkg.version, '1.6.92');
assert(controller.includes('const layerStack = [];'), 'shared overlay stack missing');
assert(controller.includes('function setExternalLayerOpen'), 'external overlay registration API missing');
assert(controller.includes('function getTopExternalLayer'), 'top overlay lookup missing');
assert(controller.includes('this.openStack = [];'), 'managed modal stack missing');
assert(controller.includes('shouldStack(name, cfg, options = {})'), 'conditional nested modal decision missing');
assert(controller.includes("dialog.dataset.foxbearModalSuspended = 'true'"), 'parent modal suspension missing');
assert(controller.includes("layer.classList.add('foxbear-fixed-overlay-layer')"), 'fixed overlay class application missing');
assert(controller.includes("normalized.panel.classList.add('foxbear-viewport-panel')"), 'viewport panel containment missing');
assert(controller.includes("global.visualViewport?.addEventListener?.('resize'"), 'visual viewport resize listener missing');
assert(controller.includes("global.visualViewport?.addEventListener?.('scroll'"), 'visual viewport scroll listener missing');
assert(controller.includes("if (!root?.style || typeof root.style.setProperty !== 'function') return;"), 'test/browser compatibility guard missing');
assert(app.match(/setExternalLayerOpen\?\.\(/g)?.length >= 4, 'app dynamic overlays are not registered with shared manager');
assert(downloadDialog.includes('FoxBearModalStateMachine?.setExternalLayerOpen?.(backdrop, true'), 'download dialog is not registered as an external dialog layer');
assert(downloadService.includes('FoxBearModalStateMachine?.setExternalLayerOpen?.(panel, true'), 'download assistance panel is not registered as a floating layer');
assert(css.includes('.foxbear-fixed-overlay-layer'), 'shared fixed overlay CSS missing');
assert(css.includes('.foxbear-viewport-panel'), 'shared viewport-constrained panel CSS missing');
assert(css.includes('[data-foxbear-modal-suspended="true"]'), 'suspended parent modal CSS missing');
assert(css.includes('--foxbear-visual-viewport-height'), 'visual viewport CSS variable missing');
assert(css.includes('max-height: calc(var(--foxbear-visual-viewport-height'), 'viewport height clamp missing');

console.log('PASS v1.6.15 conditional nested fixed overlay stack');
