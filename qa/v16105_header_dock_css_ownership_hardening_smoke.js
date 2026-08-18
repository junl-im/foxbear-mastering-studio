#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const index = read('index.html');
const studio = read('assets/css/studio.css');
const dock = read('assets/css/dock.css');
const mobile = read('assets/css/mobile-native.css');
const header = read('assets/css/header-command-bar.css');

const importantCount = text => (text.match(/!important/g) || []).length;
const hasLegacyHeaderRule = text => /(?:^|\})\s*\.(?:brand-topline|brand-right-actions)(?:[\s.{:#>+~]|\[)/m.test(text);

assert(index.includes('class="brand-topline brand-command-bar"'), 'header DOM must opt into the dedicated command-bar owner');
assert(index.includes('class="brand-kicker brand-command-left"'), 'header left rail must opt into the dedicated command-bar owner');
assert(index.indexOf('assets/css/studio.css') < index.indexOf('assets/css/dock.css'), 'Dock owner must load after legacy studio CSS');
assert(index.indexOf('assets/css/mobile-native.css') < index.indexOf('assets/css/header-command-bar.css'), 'header owner must load after mobile legacy CSS');
assert(index.indexOf('assets/css/dock.css') < index.indexOf('assets/css/dock-ui-repair.css'), 'Dock repair layer must remain after the Dock base owner');

assert(header.includes('--foxbear-header-owner: header-command-bar-v16105;'), 'header owner contract marker missing');
assert(header.includes('--foxbear-header-contract: flex-two-rail-v1690;'), 'header two-rail behavior contract missing');
assert(header.includes('.brand-topline.brand-command-bar'), 'header owner must scope the root command bar');
assert(header.includes('display: flex !important;') && header.includes('flex-flow: row nowrap !important;'), 'Pixel-class flex ownership contract missing');
assert(!hasLegacyHeaderRule(studio), 'studio.css must not reclaim brand-topline/brand-right-actions ownership');
assert(!hasLegacyHeaderRule(mobile), 'mobile-native.css must not reclaim brand-topline/brand-right-actions ownership');

assert(dock.includes('--foxbear-dock-contract: dedicated-owner-v16105;'), 'Dock owner contract marker missing');
assert(dock.includes('grid-template-columns: minmax(0,1fr) minmax(120px,auto) minmax(0,1fr) !important;'), 'desktop Dock three-zone owner contract missing');
assert(studio.includes('grid-template-columns: minmax(0, 1fr) minmax(100px, auto) minmax(0, 1fr) !important;'), 'mobile Dock three-zone responsive contract missing');
assert(dock.includes('.bottom-preview-controls') && dock.includes('overflow-x: auto !important;'), 'Dock no-wrap/overflow fallback contract missing');

assert(importantCount(studio) <= 2550, `studio.css !important budget regressed: ${importantCount(studio)}`);
assert(importantCount(dock) <= 525, `dock.css !important budget regressed: ${importantCount(dock)}`);
assert(importantCount(mobile) <= 160, `mobile-native.css !important budget regressed: ${importantCount(mobile)}`);
assert(importantCount(header) <= 180, `header-command-bar.css !important budget regressed: ${importantCount(header)}`);

console.log('PASS v1.6.105 header/dock CSS ownership hardening');
