#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const read = file => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const assetVersion = pkg.foxbearRelease.assetVersion;
const orchestrator = read('src/audio/mastering-orchestrator-service.js');
const app = read('src/app.js');
const detail = read('src/ui/detail-panels-view.js');
const diagnostics = read('src/boot/performance-diagnostics.js');
const runtime = read('src/boot/runtime-health.js');
const index = read('index.html');
const sw = read('sw.js');
const worker = read('src/workers/zip-encoder.worker.js');
const syncTool = read('tools/sync-release-metadata.js');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(orchestrator, context, { filename: 'mastering-orchestrator-service.js' });
const service = context.window.FoxBearMasteringOrchestratorService;
assert(service && typeof service.createQualityRecoveryPlan === 'function', 'quality recovery planner missing');

const gate = {
  status: 'fail',
  riskFlags: [
    { label: '과도한 리미팅', status: 'fail', detail: 'Short-term loudness overshoot' },
    { label: '고역 손실', status: 'fail', detail: 'De-esser regression' }
  ]
};
const plan = service.createQualityRecoveryPlan({
  gate,
  settings: { clarity: 88, warmth: 75, width: 82, stereoGroove: 44, analogGroove: 36, dynamicPunch: 70, metallicRemoval: 80, intensity: 145 },
  targetLufs: -9,
  ceilingDb: -0.5,
  alreadyAttempted: false
});
assert(plan, 'failed quality gate should create a recovery plan');
assert.strictEqual(plan.attemptLimit, 1, 'recovery must be limited to one attempt');
assert.strictEqual(plan.qualityMode, 'fast', 'safe recovery must use bounded fast quality mode');
assert.strictEqual(plan.truePeak, true, 'safe recovery must retain true-peak protection');
assert(plan.safeSettings.clarity <= 48 && plan.safeSettings.width <= 38 && plan.safeSettings.dynamicPunch <= 28 && plan.safeSettings.intensity <= 88, 'safe DSP settings are not conservative enough');
assert(plan.targetLufs <= -12 && plan.ceilingDb <= -1.5, 'loudness and ceiling safety margins were not applied');
assert.strictEqual(service.createQualityRecoveryPlan({ gate, alreadyAttempted: true }), null, 'recovery loop must stop after one attempt');
assert.strictEqual(service.createQualityRecoveryPlan({ gate: { status: 'pass', riskFlags: [] } }), null, 'passing output must not rerender');

const jsZipUrl = `vendor/jszip/jszip.min.js?v=${assetVersion}&lib=3.10.1`;
assert(index.includes(jsZipUrl), 'index JSZip URL must use the app asset generation');
assert(sw.includes(`./${jsZipUrl}`), 'service worker JSZip URL must use the app asset generation');
assert(worker.includes(`../../${jsZipUrl}`), 'ZIP worker JSZip URL must use the app asset generation');
assert(syncTool.includes('foxbear-root.json') && syncTool.includes('&lib=3.10.1'), 'release sync must guard the root marker and JSZip generation URL');

const swContext = {
  console, URL, Request, Response, Set, Map, Promise, Math, Date,
  indexedDB: {}, caches: {}, fetch: async () => new Response('', { status: 404 }),
  self: {
    location: { origin: 'https://example.test' },
    registration: { scope: 'https://example.test/foxbear-mastering-studio/' },
    clients: {},
    addEventListener() {},
    skipWaiting() {}
  }
};
swContext.globalThis = swContext;
vm.createContext(swContext);
vm.runInContext(`${sw}\n;globalThis.__v1553={isStaleAssetGeneration,CURRENT_ASSET_VERSION};`, swContext, { filename: 'sw.js' });
const currentJsZip = new URL(`https://example.test/foxbear-mastering-studio/${jsZipUrl}`);
const legacyLibraryOnly = new URL('https://example.test/foxbear-mastering-studio/vendor/jszip/jszip.min.js?v=3.10.1');
assert.strictEqual(swContext.__v1553.isStaleAssetGeneration(currentJsZip), false, 'current JSZip URL must not be rejected as a stale app generation');
assert.strictEqual(swContext.__v1553.isStaleAssetGeneration(legacyLibraryOnly), true, 'library-only v= URL should remain detectable as stale');

assert(app.includes('runQualityGateRecoveryAttempt') && app.includes("'failed-after-retry'"), 'one-shot recovery execution path missing');
assert(app.includes('Quality gate auto recovery failed; keeping first render'), 'first-render preservation guard missing');
assert(app.includes('const originalTrackState = {') && app.includes('Object.assign(track, originalTrackState)'), 'recovery exception must atomically restore first-render metadata');
assert(app.includes('FoxBearMasteringDiagnostics') && app.includes('getMasteringPerformanceSnapshot'), 'mastering diagnostics API missing');
['곡 전체 DSP', '가장 느린 단계', '실시간 처리 배속', '파이널라이저'].forEach(label => assert(detail.includes(label), `performance diagnostic label missing: ${label}`));
assert(detail.includes('performance-stage-list'), 'per-stage performance list missing');
assert(diagnostics.includes('masteringPerformance') && runtime.includes('FoxBearMasteringDiagnostics.getSnapshot'), 'runtime diagnostics integration missing');

console.log('PASS v1.5.53 engine recovery, performance diagnostics, and JSZip generation smoke');
