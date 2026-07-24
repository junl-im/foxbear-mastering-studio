#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1426_wake_lock_state_sync_smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const css = read('assets/css/mobile-native.css');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const index = read('index.html');
const sw = read('sw.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const report = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

must(pkg.version === '1.5.93', 'package version should be 1.5.93');
must(pkg.name === 'foxbear-mastering-studio', 'package name should use v1-4-26');
must(pkg.qaChecks.includes('node qa/v1426_wake_lock_state_sync_smoke.js'), 'package QA should run v1.5.93 smoke');
must(index.includes('data-build="1.5.93"'), 'index build marker should be 1.5.93');
must(index.includes('1.5.93-external-engine-transfer-admin-export-openai-readiness'), 'index cache key should use v1.5.93 wake key');
must(sw.includes('foxbear-shell-v1.5.93-external-engine-transfer-admin-export-openai-readiness'), 'service worker cache should use v1.5.93 wake key');

[
  'wakeLockAutoActive',
  'wakeLockLastMode',
  'wakeLockLastReason',
  'wakeLockLastError',
  'wakeLockManualRequestCount',
  'wakeLockAutoRequestCount',
  'function getWakeLockActivityReason()',
  'function getFoxBearWakeLockSnapshot()',
  'function exposeFoxBearWakeLockController()',
  'window.FoxBearWakeLockController',
  "settingLabel = userEnabled ? 'ON' : (autoActive ? 'AUTO' : 'OFF')",
  "notify = options.toast === true && !auto",
  "if (!auto && mobile.wakeLockDesired) { mobile.wakeLockDesired = false; persistRuntimeSettings(); }",
  "releaseFoxBearWakeLock({ clearDesired: false, persist: false, reason: 'auto-idle' })",
  "setMobileNativeSettingState('wake', wakeSnapshot.userEnabled, wakeLabel)",
  "button.classList.toggle('is-auto', auto)",
  "button.setAttribute('aria-pressed', auto ? 'mixed' : String(enabled))"
].forEach(token => must(app.includes(token), `app should include ${token}`));

must(!app.includes("const notify = options.toast === true;"), 'auto wake lock should not use the old toast condition');
must(!app.includes("setMobileNativeSettingState('wake', Boolean(mobile.wakeLockActive || mobile.wakeLockDesired)"), 'settings toggle should not collapse auto active with user setting');
must(!app.includes("requestFoxBearWakeLock('작업 보호 중', { toast: false, auto: true })"), 'auto wake lock should use explicit diagnostic reason instead of old opaque reason');

[
  '.mobile-native-status.wake-auto',
  '.mobile-native-setting.is-auto',
  '[data-state="auto"]',
  'AUTO state distinguishes temporary work protection'
].forEach(token => must(css.includes(token), `mobile CSS should include ${token}`));

must(runtime.includes('FoxBearWakeLockController.getSnapshot'), 'runtime health should require wake lock diagnostics');
must(runtime.includes('1.5.93-external-engine-transfer-admin-export-openai-readiness'), 'runtime health fallback version should be v1.5.93');
must(perf.includes('wakeLock = safeCall'), 'performance diagnostics should collect wake lock snapshot');
must(perf.includes('wake-lock-auto-active'), 'performance diagnostics should warn on auto wake lock');
must(perf.includes('wake-lock-last-error'), 'performance diagnostics should surface wake lock errors');
must(perf.includes('wakeLock: snapshot.wakeLock'), 'performance summary should include wake lock state');

must(matrix.includes('v1.4.26 Wake Lock State Sync'), 'matrix should document wake lock state sync');
must(matrix.includes('AUTO') && matrix.includes('automatic acquisition remains silent'), 'matrix should cover silent auto mode');
must(report.includes('148/148 PASS') || report.includes('v1.5.93'), 'QA report should mention v1.5.93 or 148/148 PASS');
must(changelog.includes('v1.5.93') && changelog.includes('Wake Lock'), 'changelog should mention v1.5.93 Wake Lock');

console.log('PASS v1.4.26 wake lock state sync smoke');
