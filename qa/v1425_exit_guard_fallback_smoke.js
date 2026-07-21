#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1425_exit_guard_fallback_smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const guards = read('src/security/site-guards.js');
const studioCss = read('assets/css/studio.css');
const runtime = read('src/boot/runtime-health.js');
const perf = read('src/boot/performance-diagnostics.js');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');

must(pkg.version === '1.5.49', 'package version should be 1.5.49');
must(pkg.name === 'foxbear-mastering-studio', 'package name should use v1-4-26');
must(pkg.qaChecks.includes('node qa/v1425_exit_guard_fallback_smoke.js'), 'package should run v1.5.49 smoke');
must(index.includes('data-build="1.5.49"'), 'index build marker should be 1.5.49');
must(index.includes('src/security/site-guards.js?v=1.5.49-asset-generation-route-recovery'), 'site guard cache key should be updated');
must(index.includes('assets/css/studio.css?v=1.5.49-asset-generation-route-recovery'), 'studio CSS cache key should be updated');
must(app.includes("const APP_VERSION = 'Pro v1.5.49'"), 'app version should be Pro v1.5.49');
must(sw.includes('foxbear-shell-v1.5.49-asset-generation-route-recovery'), 'service worker cache should use v1.5.49 key');

[
  'EXIT_FALLBACK_DELAY_MS',
  'EXIT_CLOSE_DELAY_MS',
  'pageHiding',
  'leaveAttempts',
  'lastLeaveReason',
  'lastLeaveMethod',
  'fallbackRendered',
  'handlePageHideGuard',
  "global.addEventListener('pagehide', handlePageHideGuard)",
  'clearExitFallbackTimers',
  "leaveViaHistoryBack('confirmed-popstate')",
  "leaveViaHistoryBack('unblocked-popstate')",
  'scheduleExitFallback(attemptToken)',
  "global.history.go(-1)",
  'global.close()',
  'renderExitFallbackScreen',
  'foxbear-exit-fallback-page',
  'FoxBear 작업 화면을 나갔습니다',
  '뒤로가기 한 번 더',
  '작업 화면 다시 열기',
  'fallbackDelayMs: EXIT_FALLBACK_DELAY_MS',
  'closeDelayMs: EXIT_CLOSE_DELAY_MS'
].forEach(token => must(guards.includes(token), `site guard should include ${token}`));

must(guards.includes("global.removeEventListener('beforeunload', handleBeforeUnloadGuard)"), 'leave path should remove beforeunload guard');
must(guards.includes("global.removeEventListener('popstate', handlePopStateGuard)"), 'leave path should remove popstate guard');
must(guards.includes("document.visibilityState === 'hidden'"), 'fallback should stop when document is hidden');
must(guards.includes('navigationExitGuardState.exitAttemptToken !== attemptToken'), 'fallback should ignore stale exit attempts');
must(app.includes('onLeave: () =>') && app.includes('pauseAllPreviewAudio();'), 'app exit onLeave should pause preview audio');
must(runtime.includes('FoxBearSiteGuards.getNavigationExitGuardState'), 'runtime health should still require exit guard state');
must(perf.includes('navigationGuard'), 'performance diagnostics should still collect navigation guard state');

[
  '.foxbear-exit-fallback-actions',
  '.foxbear-exit-fallback-button',
  'min-width: 148px',
  'flex-direction: column'
].forEach(token => must(studioCss.includes(token), `studio CSS should include ${token}`));

must(changelog.includes('v1.5.49') && changelog.includes('Exit Guard'), 'changelog should mention v1.5.49 Exit Guard');
must(handoff.includes('v1.5.49') && handoff.includes('뒤로가기'), 'handoff should mention v1.5.49 back navigation');
must(notes.includes('fallback'), 'project notes should preserve exit fallback guidance');
must(matrix.includes('v1.4.26') && matrix.includes('exit fallback'), 'matrix should cover v1.5.49 exit fallback');

console.log('PASS v1.4.26 exit guard fallback smoke');
