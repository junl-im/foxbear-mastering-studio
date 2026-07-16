#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const spec = read('qa/browser/preview-translation-playback-playwright.spec.js');
const dockCss = read('assets/css/dock.css');
const repairCss = read('assets/css/dock-ui-repair.css');
const html = read('index.html');

assert(
  spec.includes("window.matchMedia?.('(max-width: 720px)')?.matches === true")
    && spec.includes("'#bottomPreviewPlayer .dock-integrated-toggle'")
    && spec.includes("'#bottomPreviewPlayBtn'"),
  'preview playback E2E must select the viewport-specific desktop or mobile control'
);
assert(
  spec.includes("if (beforePlay.viewportWidth <= 720)")
    && spec.includes("toContain('dock-integrated-toggle')")
    && spec.includes("toBe('bottomPreviewPlayBtn')"),
  'preview playback E2E must assert the viewport-specific control contract'
);
assert(
  spec.includes('for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement)')
    && spec.includes("node.getAttribute('aria-hidden') === 'true'")
    && spec.includes("style.display === 'none'")
    && spec.includes("style.visibility === 'hidden'")
    && spec.includes('rect.width <= 0 || rect.height <= 0'),
  'blocking-dialog diagnostics must use rendered visibility across the ancestor chain'
);
assert(
  !spec.includes("document.querySelectorAll('.ai-recommend-dialog-backdrop, [aria-modal=\"true\"]:not([hidden])').length"),
  'preview playback E2E must not count permanently mounted hidden dialogs as blockers'
);
assert(dockCss.includes('@media (max-width: 720px)') && dockCss.includes('.bottom-preview-play-toggle { display: none !important; }'),
  'mobile layout intentionally hides the desktop external play button');
assert(repairCss.includes('.bottom-preview-dock .dock-integrated-toggle') && repairCss.includes('display: inline-grid !important;'),
  'mobile layout must expose the integrated Dock play control');
assert(html.indexOf('assets/css/dock-ui-repair.css') > html.indexOf('assets/css/dock.css'),
  'Dock repair CSS must load after the base Dock CSS so the mobile control is visible');

console.log('PASS v1.5.24 responsive preview control and rendered-dialog readiness');
