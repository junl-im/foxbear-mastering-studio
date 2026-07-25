#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL bulk HUD asset/close hotfix smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const html = read('index.html');
const css = read('assets/css/bulk-import-hud.css');
const sw = read('sw.js');

assert(pkg.qaChecks.includes('node qa/v1427_1_bulk_hud_asset_close_hotfix_smoke.js'), 'package QA should include this hotfix smoke');
assert(fs.existsSync(path.join(root, 'assets/css/bulk-import-hud.css')), 'bulk HUD CSS asset must be packaged');
assert(html.includes('assets/css/bulk-import-hud.css?v=1.6.9-incident-readiness-history-recovery-copy-events&h=bulk-hud-close-hotfix'), 'index must load bulk HUD CSS with a targeted stale-cache bust key');
assert(html.includes('data-cache-hotfix="bulk-hud-close"'), 'bulk HUD CSS link should document the targeted cache hotfix');
assert(/bulk-import-hud\.css[^>]+integrity="sha384-/.test(html), 'bulk HUD CSS should keep SRI after the targeted cache bust');
assert(sw.includes('./assets/css/bulk-import-hud.css?v=1.6.9-incident-readiness-history-recovery-copy-events&h=bulk-hud-close-hotfix'), 'service worker should precache the cache-busted bulk HUD CSS');

assert(html.includes('id="bulkImportHudClose"') && html.includes('aria-label="대량 작업 HUD 숨기기"'), 'bulk HUD close button should have an accessible label');
assert(html.includes('aria-label="대량 작업 HUD 숨기기">×</button>'), 'bulk HUD close button should use the common centered x glyph');
assert(css.includes('.bulk-import-hud-close {') && css.includes('border-radius: 50%'), 'bulk HUD close button should be circular like shared overlay closers');
assert(css.includes('display: inline-flex') && css.includes('align-items: center') && css.includes('justify-content: center'), 'bulk HUD buttons should center their glyph/text');
assert(css.includes('width: 30px') && css.includes('height: 30px') && css.includes('padding: 0'), 'desktop close button should have fixed equal dimensions');
assert(css.includes('width: 28px') && css.includes('height: 28px'), 'mobile close button should keep equal dimensions');

console.log('PASS bulk HUD asset/close hotfix smoke');
