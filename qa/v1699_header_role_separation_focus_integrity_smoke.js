#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const app = read('src/app.js');
const header = read('assets/css/header-command-bar.css');
const uiMode = read('assets/css/ui-mode.css');

assert.strictEqual(pkg.version, '1.6.104');
assert(index.includes('id="deviceCompatibilityBadge"') && index.includes('role="img"'), 'device compatibility status must be a dedicated static image role');
assert(index.includes('brand-command-device-icons') && index.includes('is-screen') && index.includes('is-phone'), 'PC/mobile glyphs must stay in static header markup');
assert(index.includes('id="adminStatsTrigger"') && index.includes('admin-monitor-trigger'), 'admin monitor must use a separate native button');
assert(!app.includes('renderAdminStatsTriggerContent'), 'admin auth refresh must never replace compatibility glyph contents');
assert(!app.includes("el.adminStatsTrigger.addEventListener('keydown'"), 'native admin button must not double-handle Enter/Space');
assert(app.includes('el.adminStatsTrigger.hidden = !visible') && app.includes('el.adminStatsTrigger.disabled = !visible'), 'admin monitor visibility and disabled state must follow admin auth');
assert(app.includes('adminStatsReturnFocus = document.activeElement') && app.includes('returnFocus.focus({ preventScroll: true })'), 'admin monitor close must restore focus safely');
assert(header.includes('.admin-monitor-trigger[hidden] { display: none !important; }'), 'hidden admin trigger must remain layout-free');
assert(/@media \(max-width: 430px\)[\s\S]*?\.brand-command-device-icons\s*\{[\s\S]*?display:\s*inline-flex/.test(header), 'device glyphs must remain visible on Pixel-class phones');
assert(!uiMode.includes('body[data-ui-mode="ai"] .brand-command-device,'), 'AI mobile mode must not hide the compatibility token');
console.log('PASS v1.6.99 header role separation + admin focus integrity');
