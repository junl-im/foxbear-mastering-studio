#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

const version = '1.7.2-expert-workspace-default-entry';
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const view = read('src/ui/mobile-native-view.js');
const service = read('src/settings/settings-service.js');
const runtimeHealth = read('src/boot/runtime-health.js');
const pkg = read('package.json');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(index.includes(`src/settings/settings-service.js?v=${version}`), 'index should load settings-service.js with Stage18 asset version');
assert(index.indexOf('src/state/app-state.js') < index.indexOf('src/settings/settings-service.js'), 'settings service should load after app state');
assert(index.indexOf('src/settings/settings-service.js') < index.indexOf('src/app.js'), 'settings service should load before app.js');
assert(sw.includes(`./src/settings/settings-service.js?v=${version}`), 'service worker should precache settings-service.js');
assert(sw.includes(`foxbear-shell-v1.7.2-expert-workspace-default-entry`), 'service worker cache should use Stage18 or later key');
assert(service.includes("STORAGE_KEY = 'foxbear-settings-v1.4.0'"), 'settings service should use versioned localStorage key');
assert(service.includes('applyToContext') && service.includes('saveFromContext') && service.includes('reset'), 'settings service should expose apply/save/reset APIs');
[
  'autoCacheClean',
  'smartPerformanceGuard',
  'hapticsEnabled',
  'wakeLockDesired',
  'storagePersistRequested'
].forEach(key => assert(service.includes(key), `settings service should persist ${key}`));
[
  'autoHighlightAB',
  'abLoopMode',
  'abLevelMatch',
  'abDifferenceListen',
  'engineSafetyMeter'
].forEach(key => assert(!service.includes(key), `settings service should not persist removed panel setting ${key}`));
assert(app.includes("runInitStep('설정 저장값 복원', restorePersistedSettings)"), 'app should restore persisted settings during init');
assert(app.includes('persistRuntimeSettings();\n    renderFeatureButtons();'), 'utility toggles should persist before rerender');
assert(app.includes('persistRuntimeSettings();\n    foxBearHaptic'), 'haptic toggle should persist');
assert(app.includes('mobile.wakeLockDesired = true;') && app.includes('persistRuntimeSettings();'), 'wake lock desired state should persist');
assert(app.includes('case \'reset-settings\':') && app.includes('resetPersistedSettings();'), 'mobile settings panel should handle reset-settings');
assert(view.includes("['reset-settings', '↩️', '설정초기화'"), 'settings panel should include reset settings action');
assert(runtimeHealth.includes('FoxBearSettingsService.applyToContext'), 'runtime health should require settings service global');
assert(pkg.includes('node --check src/settings/settings-service.js'), 'package QA should syntax-check settings service');
assert(pkg.includes('node qa/stage18_settings_persistence_smoke.js'), 'package QA should include Stage18 smoke test');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be Stage18 or later');

console.log('PASS Stage18 settings persistence smoke');
