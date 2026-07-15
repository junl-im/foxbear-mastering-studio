#!/usr/bin/env node
const fs = require('fs');
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage12_1_dock_ui_repair_smoke: ${message}`);
    process.exit(1);
  }
}
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const mobile = read('src/ui/mobile-native-view.js');
const repair = read('assets/css/dock-ui-repair.css');
const pkg = JSON.parse(read('package.json'));

assert(index.includes('assets/css/dock-ui-repair.css'), 'index should load dock-ui-repair.css as final Dock repair layer');
assert(sw.includes('assets/css/dock-ui-repair.css'), 'service worker should precache dock-ui-repair.css');
assert(/stage12(?:\.1|\.2)|stage12\.2-cachefix|stage13|stage14|stage15|stage16|stage17|stage18|stage19|stage20|stage21|stage22|stage23|stage24|stage25|stage26|stage27|stage28/.test(sw) || sw.includes('foxbear-shell-v1.5.13-handoff-package-integrity'), 'service worker cache should be bumped to stage12.1 or later');
assert(repair.includes('grid-template-columns: 32px minmax(0, 1fr) minmax(58px, 72px)'), 'mobile Dock player should keep toggle, full waveform, and compact time columns');
assert(repair.includes('grid-column: auto !important') && repair.includes('.player-time.dock-integrated-time'), 'Dock runtime label should reset legacy player-time grid placement');
assert(repair.includes('.bottom-preview-subline') && repair.includes('grid-template-columns: minmax(0, 1fr) auto'), 'file info genre and compare chip should stay on one line');
assert(repair.includes('.bottom-compare-open-label em') && repair.includes('display: none !important'), 'Dock compare chip should be compact one-line, not stacked');
assert(app.includes('\\u{1F4F1} 스마트폰') && !mobile.includes("['phone'"), 'Dock phone mode should stay smartphone while mobile settings removes duplicate phone action');
assert(app.includes('\\u{1F30A} 비교') && app.includes('\\u{1F6E0} 마스터링'), 'Dock action labels should include emoji polish');
assert(pkg.qaChecks.includes('node qa/stage12_1_dock_ui_repair_smoke.js'), 'package QA should include stage12.1 Dock UI repair smoke');
console.log('PASS stage12.1 Dock UI repair smoke');
