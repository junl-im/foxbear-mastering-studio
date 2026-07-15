#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL v1.5.3 bulk HUD visibility/master-all smoke: ${message}`);
    process.exit(1);
  }
}

const index = read('index.html');
const hud = read('src/ui/bulk-import-hud-view.js');
const mobile = read('src/ui/mobile-native-view.js');
const app = read('src/app.js');
const css = read('assets/css/bulk-import-hud.css');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));

assert(index.includes('id="bulkImportHudToggle"') && index.includes('>숨김</button>'), 'HUD toggle copy should be renamed from 접기 to 숨김');
assert(!index.includes('>접기</button>'), 'legacy 접기 copy should not remain in the HUD toggle');
assert(index.includes('id="bulkImportHudMasterAll"') && index.includes('전체 마스터링'), 'large HUD should include an inline 전체 마스터링 button');
assert(mobile.includes("id: 'bulkImportHudRestore'") && mobile.includes("text: '보이기'"), 'mobile settings layer should create the hidden-state 보이기 button beside settings');
assert(hud.includes('function hideCurrentHud') && hud.includes('function restoreHud'), 'HUD view should expose hide/restore controls');
assert(hud.includes('toggle.addEventListener(\'click\', hideCurrentHud)') && hud.includes("toggle.textContent = '숨김'"), '숨김 should hide the whole HUD rather than only collapsing the list');
assert(hud.includes('updateRestoreButton(summary)') && hud.includes('summary.restorable'), 'HUD should show restore control only while the hidden batch is restorable');
assert(hud.includes('runMasterAllFromHud') && hud.includes("getEl('masterAllBtn')") && hud.includes('mainButton.click()'), 'HUD 전체 마스터링 should delegate to the existing main button action');
assert(app.includes('onMasterAll: () => masterAllTracks()'), 'app should provide a fallback master-all bridge to the HUD view');
assert(css.includes('.bulk-import-hud-restore') && css.includes('.bulk-import-hud-master-all') && css.includes('.bulk-import-hud-actions'), 'CSS should style restore and HUD master-all controls');
assert(index.includes('bulk-hud-v153') && index.includes('bulk-hud-restore-v153') && index.includes('&ui=v153'), 'changed HUD assets should use targeted v1.5.3 stale-cache bust keys');
assert(sw.includes('bulk-hud-v153') && sw.includes('bulk-hud-restore-v153') && sw.includes('&ui=v153'), 'service worker precache should match v1.5.3 HUD cache keys');
assert(pkg.qaChecks.some(cmd => cmd.includes('qa/v153_bulk_hud_visibility_masterall_smoke.js')), 'package qaChecks should include this v1.5.3 smoke');
assert(read('README.md').includes('v1.5.3') && /\b(\d+)\/\1 PASS\b/.test(read('qa/QA_REPORT.md')), 'docs should record the current QA target and v1.5.3 carry-forward');

console.log('PASS v1.5.3 bulk HUD visibility/master-all smoke');
