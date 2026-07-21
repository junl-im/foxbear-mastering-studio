#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 stability polish smoke: ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const spectrum = read('src/ui/spectrum-visualizer.js');
const guards = read('src/security/site-guards.js');
const runtime = read('src/boot/runtime-health.js');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');

must(pkg.version === '1.5.61', 'package version should be 1.5.61');
must(app.includes("const APP_VERSION = 'Pro v1.5.61'"), 'app version should be Pro v1.5.61');
must(index.includes('data-build="1.5.61"'), 'index build marker should be 1.5.61');
must(index.includes('1.5.61-worker-mail-delivery-recovery'), 'index should use v1.5.61 cache key');
must(sw.includes('foxbear-shell-v1.5.61-worker-mail-delivery-recovery'), 'service worker cache should use v1.5.61 key');
must(sw.includes('./src/ui/spectrum-visualizer.js?v=1.5.61-worker-mail-delivery-recovery'), 'service worker should precache v1.5.61 spectrum visualizer');

must(spectrum.includes('function pruneDisconnectedCanvases'), 'spectrum should prune disconnected spectrum canvases');
must(spectrum.includes('if (state.canvas && state.canvas.isConnected === false) state.canvas = null'), 'spectrum should release stale full canvas refs');
must(spectrum.includes('function bindVisibilityLifecycle'), 'spectrum should bind visibility lifecycle');
must(spectrum.includes("visibilitychange"), 'spectrum should recover on visibilitychange');
must(spectrum.includes('getFrameDelay()') && spectrum.includes('isDocumentHidden() ? 250 : 33'), 'spectrum should throttle hidden-tab frames');
must(spectrum.includes('lastLiveValues') && spectrum.includes('lastLiveValueCount'), 'spectrum diagnostics should expose live value state');
must(spectrum.includes('function getDiagnostics'), 'spectrum should expose diagnostics');
must(spectrum.includes('getDiagnostics'), 'spectrum diagnostics should be exported');

must(guards.includes('confirmOpen'), 'exit guard should debounce duplicate popstate confirms');
must(guards.includes('setTimeout(tryPushExitGuardState, 0)'), 'exit guard should re-push cancelled state asynchronously');
must(guards.includes('function getNavigationExitGuardState'), 'exit guard should expose diagnostics state');
must(runtime.includes('FoxBearSpectrumVisualizer.getDiagnostics'), 'runtime health should require spectrum diagnostics');
must(runtime.includes('FoxBearSiteGuards.getNavigationExitGuardState'), 'runtime health should require exit guard diagnostics');

must(matrix.includes('v1.4.26') && matrix.includes('confirm') && matrix.includes('Dock mini FFT'), 'QA matrix should mention v1.5.61 Dock FFT/back confirm focus');
must(changelog.includes('v1.5.61') && changelog.includes('stability'), 'changelog should include v1.5.61 stability entry');
must(handoff.includes('v1.5.61') && handoff.includes('stability'), 'handoff should include v1.5.61 stability entry');
must(pkg.qaChecks.includes('node qa/v146_stability_polish_smoke.js'), 'package should run v1.5.61 polish smoke');

console.log('PASS v1.4.26 stability polish smoke');
