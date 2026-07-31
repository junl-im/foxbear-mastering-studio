#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage16_mobile_settings_panel_smoke: ${message}`);
    process.exit(1);
  }
}

const app = read('src/app.js');
const view = read('src/ui/mobile-native-view.js');
const css = read('assets/css/mobile-native.css');
const sw = read('sw.js');
const index = read('index.html');
const pkg = JSON.parse(read('package.json'));

assert(view.includes("text: '⚙'") && view.includes("panelTitle.textContent = '설정'"), 'mobile quick toggle should remain an icon-only gear settings panel');
assert(view.includes("panel.setAttribute('aria-label', 'FoxBear 모바일 설정 패널')"), 'settings panel should have settings aria label');
assert(!view.includes("['original'") && !view.includes("['phone'") && !view.includes("['mono'"), 'settings panel should remove Dock-duplicated original/phone/mono controls');
assert(view.includes("['install', '📲', '바로가기 추가'") && view.includes("['external-browser', '🌐', '외부 브라우저로 열기'") && view.includes("['smart-performance', '🧠', '성능가드'"), 'settings panel should include shortcut, external browser, and real option settings');
assert(view.includes('mobile-native-setting-state') && view.includes('stateNode.dataset.settingState'), 'settings buttons should include visible state badge nodes');

assert(app.includes("case 'external-browser':") && app.includes('openCurrentPageInExternalBrowser();'), 'app should route external browser setting');
assert(!app.includes("case 'auto-highlight':") && !app.includes("case 'ab-loop':"), 'removed comparison controls should not be settings actions');
assert(app.includes("case 'smart-performance':") && app.includes("toggleUtilityFeature('smartPerformanceGuard')"), 'app should route performance guard setting');
assert(app.includes('function setMobileNativeSettingState') && app.includes("textContent = label"), 'app should sync ON/OFF badges');
assert(app.includes("setMobileNativeSettingState('haptic', Boolean(mobile.hapticsEnabled))"), 'haptic state should sync to settings panel');
assert(!/case 'original':[\s\S]{0,240}selectBottomPreviewMode\('original'/.test(app), 'mobile settings handler should not keep Dock playback duplicate actions');

assert(css.includes('Stage16: Quick panel is now a compact Settings panel'), 'mobile CSS should include Stage16 settings layer');
assert(css.includes('.mobile-native-setting-grid') && css.includes('.mobile-native-setting-state'), 'settings CSS should define grid and state badges');
assert(css.includes("content: '⚙️'"), 'settings panel heading should use gear visual');
assert(css.includes('data-state="on"') && css.includes('data-state="off"'), 'CSS should style ON/OFF states');

assert(index.includes('1.6.45-windows-release-gate-spark-hosting-no-app-check'), 'index asset query should use Stage16 cache key');
assert(sw.includes('foxbear-shell-v1.6.45-windows-release-gate-spark-hosting-no-app-check'), 'service worker cache should use Stage16 cache key');
assert(pkg.qaChecks.includes('node qa/stage16_mobile_settings_panel_smoke.js'), 'package QA should include Stage16 settings smoke');

console.log('PASS stage16 mobile settings panel smoke');
