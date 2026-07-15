#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage25_compare_controls_rehome_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.5.12-ci-runtime-readiness';
const index = read('index.html');
const sw = read('sw.js');
const pkg = read('package.json');
const app = read('src/app.js');
const state = read('src/state/app-state.js');
const cardsCss = read('assets/css/components/cards.css');
const settingsService = read('src/settings/settings-service.js');
const mobileView = read('src/ui/mobile-native-view.js');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(index.includes(version), 'index should use Stage25 asset query');
assert(sw.includes(`foxbear-shell-v${version}`), 'service worker should use Stage25 cache key');
assert(pkg.includes('FoxBear AI Mastering Studio'), 'package description should identify the FoxBear project');
assert(pkg.includes('node qa/stage25_compare_controls_rehome_smoke.js'), 'package should run Stage25 smoke');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be Stage25');

assert(!index.includes('id="abMatchBtn"'), 'global A/B level-match button should be removed from main tools grid');
assert(!index.includes('id="abLoopBtn"'), 'global A/B loop button should be removed from main tools grid');
assert(index.includes('aria-label="캐시 및 장르 잠금"'), 'main tools grid should be renamed to cache/genre controls');

assert(app.includes("compareTools.className = 'ab-switch-compare-tools'"), 'A/B deck should create compare controls strip');
assert(app.includes("dataset.compareTool = key"), 'compare controls should have stable data keys');
['level-match', 'ab-loop', 'difference-listen', 'highlight-seek'].forEach(key => {
  assert(app.includes(`'${key}'`), `A/B deck should expose ${key}`);
});
assert(app.includes('syncCompareToolUi'), 'A/B deck should keep compare controls visually synced');
assert(app.includes('state.abLevelMatch = !state.abLevelMatch'), 'level match should toggle from compare deck');
assert(app.includes('state.abLoopMode = !state.abLoopMode'), 'A/B loop should toggle from compare deck');
assert(app.includes('state.abDifferenceListen = !state.abDifferenceListen'), 'difference listen should toggle from compare deck');
assert(app.includes('getTrackHighlightStart(track)'), 'highlight seek should use track highlight start');
assert(app.includes('renderBottomPreviewDock({ keepPlaying: true'), 'compare controls should keep Dock compare state in sync');

const utilityBlock = app.slice(app.indexOf('const UTILITY_FEATURE_DEFINITIONS = {'), app.indexOf('const PREVIEW_TRANSLATION_MODES'));
['abLevelMatch', 'abLoopMode', 'abDifferenceListen', 'autoHighlightAB', 'engineSafetyMeter'].forEach(key => {
  assert(!utilityBlock.includes(key), `settings utility definitions should not contain ${key}`);
  assert(!settingsService.includes(key), `settings service should not persist ${key}`);
});
assert(state.includes('autoHighlightAB: false'), 'automatic highlight A/B should default to off after settings cleanup');
['자동 하이라이트', 'A/B 루프', '레벨매칭', '차이듣기', '안전점수'].forEach(label => {
  assert(!mobileView.includes(label), `mobile settings panel should not expose ${label}`);
});

assert(cardsCss.includes('.ab-switch-compare-tools'), 'cards CSS should style compare control strip');
assert(cardsCss.includes('.ab-compare-tool.active'), 'compare control active state should be styled');
assert(cardsCss.includes('@media (max-width: 720px)'), 'compare controls should have mobile layout');

console.log('PASS stage25 compare controls rehome smoke');
