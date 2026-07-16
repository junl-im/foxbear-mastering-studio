#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { getReleaseMetadata } = require('../tools/release-metadata');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.5.26 engraved command header smoke: ${message}`);
    process.exit(1);
  }
};

const meta = getReleaseMetadata();
const html = read('index.html');
const css = read('assets/css/header-command-bar.css');
const mobileView = read('src/ui/mobile-native-view.js');
const releasePresentation = read('src/boot/release-presentation-service.js');
const app = read('src/app.js');
const sw = read('sw.js');
const sriTool = read('tools/update-sri.py');

assert(html.includes('brand-topline brand-command-bar'), 'dedicated command bar class missing');
assert(html.includes('<span class="brand-command-label">BUILD</span>'), 'BUILD label missing');
assert(html.includes(`class="brand-command-version" data-release-label="version-button">v${meta.productVersion}</strong>`), 'runtime-bound build version missing');
assert(html.includes('brand-command-device-text">모바일 · PC 호환</span>'), 'mobile/PC compatibility label missing');
assert(html.includes('AI MUSIC MASTERING STUDIO'), 'studio identity label missing');
assert(html.includes('<span>DESIGNED BY</span>') && html.includes('<strong>곰같은여우</strong>'), 'designer signature should be compact and exact');
assert(!html.includes('DESIGN BY</span>') && !html.includes('곰같은여우 <em>with AI</em>'), 'legacy designer wording returned');
assert(html.indexOf('assets/css/header-command-bar.css') > html.indexOf('assets/css/components/floating-overlays.css'), 'command header CSS must load last');
assert(sw.includes(`./assets/css/header-command-bar.css?v=${meta.assetVersion}`), 'command header CSS missing from service-worker cache');
assert(!html.includes('/ integrity='), 'SRI updater produced a malformed self-closing link tag');
assert(sriTool.includes("self_closing = tag.rstrip().endswith('/>')"), 'SRI updater must preserve self-closing tags when adding a new hash');
assert(css.includes('.brand-command-left') && css.includes('.brand-command-studio'), 'command header layout rules missing');
assert(css.includes('border-bottom: 1px solid') && css.includes('background: transparent !important'), 'engraved divider/transparent treatment missing');
assert(css.includes('.mobile-native-quick-toggle::after') && css.includes('content: none !important'), 'settings text label must stay removed');
assert(mobileView.includes("text: '⚙'"), 'settings control should use one text-style gear glyph');
assert(!mobileView.includes("text: '⚙️'"), 'emoji-style settings glyph should not return');
assert(releasePresentation.includes("setText('[data-release-label=\"version-button\"]', VERSION_LABEL, mismatches)"), 'release presentation should update only the build version token');
assert(app.includes("'모바일 · PC 호환 안내'") && app.includes("'모바일 · PC 호환'"), 'runtime compatibility text should match the new header order');
assert(read('tools/sync-release-metadata.js').includes("'foxbear-shell-v1.5.5-update-safety'"), 'foundational update-safety cache must remain pinned');
console.log('PASS v1.5.26 engraved command header smoke');
