#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('src/app.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert(app.includes('MASTERING_PROGRESS_VISIBLE_STEP = 1'), 'mastering HUD should expose 1 percent visible progress');
assert(app.includes('MASTERING_PROGRESS_FULL_RENDER_STEP = 5'), 'full render cadence should remain 5 percent');
assert(app.includes('MASTERING_PROGRESS_HEARTBEAT_MS = 320'), 'heartbeat cadence contract missing');
assert(app.includes("Math.max(1, quantizeProgressStep(progress, 1))"), 'processing HUD should render one-percent progress');
assert(app.includes("${visibleProgress}% 진행 중"), 'processing HUD should visibly say progress is active');
assert(app.includes('updateProcessingHud();'), 'lightweight progress path should update the HUD directly');
assert(app.includes('_lastMasteringFullRenderStep'), 'full renders should be deduplicated between 1 percent HUD ticks');
assert(app.includes("startMasteringProgressHeartbeat(track, 9"), 'decode stage should keep visible activity below its next checkpoint');
assert(app.includes("startMasteringProgressHeartbeat(track, 79"), 'master-chain stage should keep visible activity below 80 percent');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 40, 54"), 'pitch worker progress should map into the overall mastering range');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 90, 94"), 'finalizer worker progress should map into the overall mastering range');
assert(app.includes("applyMappedMasteringProgress(track, masteringJobId, 95, 99"), 'encoder worker progress should map into the overall mastering range');
assert(app.includes("await sanitizeAudioBufferCooperative(masteredBuffer, 'master-chain'"), 'master-chain completion should use cooperative safety scanning without blocking progress paint');
assert(app.split('\n').length - 1 < 13300, 'app.js should remain below the 13,300 line architecture gate');

const helperStart = app.indexOf('function quantizeProgressStep');
const helperEnd = app.indexOf('async function waitForTrackAnalysisIfNeeded', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'mastering progress helper block missing');
const helperSource = app.slice(helperStart, helperEnd);
let intervalCallback = null;
let hudUpdates = 0;
let fullRenders = 0;
const sandbox = {
  MASTERING_PROGRESS_VISIBLE_STEP: 1,
  MASTERING_PROGRESS_FULL_RENDER_STEP: 5,
  MASTERING_PROGRESS_HEARTBEAT_MS: 320,
  SAFE_MASTERING_PROGRESS_RENDER_DELAY_MS: 110,
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  updateBulkImportHud() {},
  updateProcessingHud() { hudUpdates += 1; },
  scheduleRenderAll() { fullRenders += 1; },
  yieldToBrowser: async () => {},
  setInterval(callback) { intervalCallback = callback; return 1; },
  clearInterval() {},
  Math, Number, String, Boolean, Object, Promise
};
vm.runInNewContext(`${helperSource}\nthis.api={quantizeProgressStep,startMasteringProgressHeartbeat,applyMappedMasteringProgress};`, sandbox);
assert.strictEqual(sandbox.api.quantizeProgressStep(8.99, 1), 8, 'one-percent quantization must not round ahead');
assert.strictEqual(sandbox.api.quantizeProgressStep(99.99, 1), 99, 'processing progress must not display 100 before completion');
const track = { status: 'processing', progress: 65, report: '', masteringJobId: 'job-1' };
const stop = sandbox.api.startMasteringProgressHeartbeat(track, 69, '렌더링 중');
assert.strictEqual(typeof intervalCallback, 'function');
intervalCallback(); intervalCallback(); intervalCallback(); intervalCallback(); intervalCallback();
assert.strictEqual(track.progress, 69, 'heartbeat must move by 1 percent and stop at the reserved cap');
assert(hudUpdates >= 4, 'heartbeat should update the lightweight HUD for each visible tick');
assert(fullRenders <= 1, 'heartbeat must not full-render the application on every 1 percent tick');
stop();
sandbox.api.applyMappedMasteringProgress(track, 'job-1', 90, 94, { percent: 50, stage: '파이널라이저' }, '파이널라이저');
assert.strictEqual(track.progress, 92, 'worker progress should map truthfully into its reserved overall range');

assert(pkg.qaChecks.includes('node qa/v16108_mastering_progress_visibility_hardening_smoke.js') || pkg.version === '1.7.0', 'new QA must be registered before release');
console.log('PASS v1.6.108 mastering progress visibility hardening smoke');
