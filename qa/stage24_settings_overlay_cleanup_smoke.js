#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage25_settings_overlay_cleanup_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.6.113-incident-finalizer-p1-hardening';
const index = read('index.html');
const sw = read('sw.js');
const pkg = read('package.json');
const app = read('src/app.js');
const mobileView = read('src/ui/mobile-native-view.js');
const settingsService = read('src/settings/settings-service.js');
const playbackService = read('src/audio/playback-link-service.js');
const playbackCss = read('assets/css/components/playback-link.css');
const overlayCss = read('assets/css/components/floating-overlays.css');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(index.includes(version), 'index should use Stage25 asset query');
assert(sw.includes(`foxbear-shell-v${version}`), 'service worker should use Stage25 cache key');
assert(index.includes(`assets/css/components/floating-overlays.css?v=${version}`), 'floating overlay CSS should be loaded');
assert(sw.includes(`./assets/css/components/floating-overlays.css?v=${version}`), 'SW should precache floating overlay CSS');
assert(pkg.includes('FoxBear AI Mastering Studio'), 'package description should identify the FoxBear project');
assert(pkg.includes('node qa/stage24_settings_overlay_cleanup_smoke.js'), 'package should run Stage25 smoke');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be Stage25');

assert(playbackService.includes('DEBUG_VISIBLE_CHIPS = false'), 'playback chips should be disabled by default');
assert(playbackService.includes('existing.remove()'), 'existing playback chips should be removed');
assert(playbackCss.includes('display: none !important'), 'playback chip CSS should force-hide visible status chip');

['자동 하이라이트', 'A/B 루프', '레벨매칭', '차이듣기', '안전점수'].forEach(label => {
  assert(!mobileView.includes(label), `settings panel should not expose ${label}`);
});
['auto-highlight', 'ab-loop', 'ab-level-match', 'ab-difference', 'engine-safety'].forEach(action => {
  assert(!mobileView.includes(`'${action}'`), `settings panel should not include ${action}`);
  assert(!app.includes(`case '${action}':`), `app should not handle removed settings action ${action}`);
});
assert(mobileView.includes('바로가기 추가'), 'install label should be 바로가기 추가');
assert(mobileView.includes('화면켜짐유지'), 'wake label should be 화면켜짐유지');
assert(mobileView.includes('진동알림'), 'haptic label should be 진동알림');
assert(mobileView.includes("['external-browser', '🌐', '외부 브라우저로 열기'"), 'external browser action should be in settings panel');
assert(app.includes("case 'external-browser':") && app.includes('openCurrentPageInExternalBrowser();'), 'external browser action should call external browser opener');

['autoHighlightAB', 'abLoopMode', 'abLevelMatch', 'abDifferenceListen', 'engineSafetyMeter'].forEach(key => {
  assert(!settingsService.includes(key), `settings service should not persist removed setting ${key}`);
});
['autoCacheClean', 'smartPerformanceGuard', 'hapticsEnabled', 'wakeLockDesired', 'storagePersistRequested'].forEach(key => {
  assert(settingsService.includes(key), `settings service should still persist real setting ${key}`);
});

assert(app.includes('function syncFloatingOverlayStack'), 'app should sync floating overlay stack');
assert(app.includes("body.classList.toggle('processing-hud-active'"), 'app should expose processing HUD active state on body');
assert(app.includes("--foxbear-processing-hud-height"), 'app should measure processing HUD height');
assert(overlayCss.includes('body.processing-hud-active.bottom-preview-active .toast'), 'toast should move above HUD and Dock');
assert(overlayCss.includes('z-index: 10040'), 'toast should stack above processing HUD');

console.log('PASS stage25 settings overlay cleanup smoke');
