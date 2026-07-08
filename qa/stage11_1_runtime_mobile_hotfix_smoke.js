#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage11_1_runtime_mobile_hotfix_smoke: ${message}`);
    process.exit(1);
  }
}

const core = read('src/utils/core-utils.js');
const app = read('src/app.js');
const mobileView = read('src/ui/mobile-native-view.js');
const mobileCss = read('assets/css/mobile-native.css');
const dockCss = read('assets/css/dock.css');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');

assert(core.includes('function getWaveformMarkerForIndex'), 'core utils should export shared waveform marker helper');
assert(core.includes('getWaveformMarkerForlndex: getWaveformMarkerForIndex'), 'core utils should include lowercase-l alias for typo compatibility');
assert(app.includes('getWaveformMarkerForIndex = FoxBearCoreUtils.getWaveformMarkerForlndex'), 'app.js should destructure waveform marker helper with fallback alias');
assert(app.includes('createManagedWaveformBars') && app.includes("barClassPrefix: 'dock-integrated-waveform'"), 'Dock waveform renderer should use managed view with shared marker helper');
assert(!/getWaveformMarkerForlndex\s*\(/.test(app), 'app.js should not call the typo helper name directly');

assert(app.includes('measured > 0') && app.includes('clamp(measured, minReasonable, maxReasonable)'), 'Dock floating offset should use measured Dock height instead of forcing tall fallback');
assert(app.includes('const floatingGap = mobile ? 1 : 10'), 'mobile floating gap should be pinned close to Dock');
assert(app.includes('const hudGap = mobile ? 1 : 8'), 'mobile HUD gap should be pinned close to Dock');
assert(app.includes('const panelGap = mobile ? 4 : 18'), 'mobile panel gap should be tightened');

assert(mobileView.includes('const status = null'), 'mobile quick panel should remove the legacy status chip beside the quick toggle');
assert(mobileView.includes('legacyStatus') && mobileView.includes('removeChild(legacyStatus)'), 'existing legacy status chip should be removed when found');
assert(mobileView.includes("className: 'mobile-native-close download-options-close'"), 'settings panel close button should match other popup close styling');
assert(mobileView.includes("panelTitle.textContent = '설정'") && mobileView.includes("['install', '📲', '바로가기 추가'"), 'mobile panel should be converted to settings with app-add action');

assert(mobileCss.includes('Stage11.1: Dock-attached quick panel cleanup'), 'mobile-native.css should include Stage11.1 quick panel cleanup layer');
assert(mobileCss.includes('.mobile-native-status {') && mobileCss.includes('display: none !important'), 'legacy quick panel status chip should be hidden by CSS');
assert(mobileCss.includes('Stage16: Quick panel is now a compact Settings panel') && mobileCss.includes('.mobile-native-setting-state'), 'settings panel should render visible ON/OFF state badges');
assert(dockCss.includes('Stage11.1: pin mobile floating notices'), 'dock.css should include Stage11.1 floating notice anchor layer');
assert(dockCss.includes('var(--bottom-preview-floating-bottom') && dockCss.includes('var(--bottom-preview-hud-bottom'), 'toast/HUD should use measured floating Dock offsets');

assert(/stage(?:11\.1|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28)/.test(sw) || sw.includes('foxbear-shell-v1.4.24-bulk-import-hud'), 'service worker cache should be bumped to stage11.1 or later');
assert(pkg.qaChecks.includes('node qa/stage11_1_runtime_mobile_hotfix_smoke.js'), 'package QA should include stage11.1 smoke');
assert(changelog.includes('Stage11.1') && handoff.includes('Stage11.1') && notes.includes('Stage11.1'), 'handoff docs should mention Stage11.1');

console.log('PASS stage11.1 runtime/mobile hotfix smoke');
