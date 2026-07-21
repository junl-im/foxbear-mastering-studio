#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const read = file => fs.readFileSync(file, 'utf8');

const orchestratorSource = read('src/audio/mastering-orchestrator-service.js');
const qualitySource = read('src/audio/quality-gate-service.js');
const appSource = read('src/app.js');
const detailSource = read('src/ui/detail-panels-view.js');
const browserSpec = read('qa/browser/quality-recovery-profiles-playwright.spec.js');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(orchestratorSource, context, { filename: 'mastering-orchestrator-service.js' });
const service = context.window.FoxBearMasteringOrchestratorService;
assert(service && typeof service.createQualityRecoveryPlan === 'function', 'quality recovery planner missing');

const baseSettings = {
  clarity: 88,
  warmth: 78,
  width: 86,
  stereoGroove: 46,
  analogGroove: 40,
  dynamicPunch: 74,
  metallicRemoval: 82,
  intensity: 150
};
const makeGate = flags => ({
  status: 'fail',
  riskFlags: flags.map(flag => ({ status: 'fail', detail: 'deterministic regression fixture', ...flag }))
});
const planFor = (flags, extra = {}) => service.createQualityRecoveryPlan({
  gate: makeGate(flags),
  settings: baseSettings,
  targetLufs: -9,
  ceilingDb: -0.4,
  ...extra
});

const phase = planFor([{ code: 'PHASE_RISK', label: '스테레오 위상' }]);
assert.strictEqual(phase.profileId, 'phase-stabilization', 'phase risk must select phase profile');
assert(phase.safeSettings.width <= 20 && phase.safeSettings.stereoGroove <= 2, 'phase profile must collapse unsafe width and stereo groove');
assert(phase.profileIds.includes('phase-stabilization'), 'phase profile list missing');

const spectral = planFor([{ code: 'HIGH_LOSS', label: '고역 손실' }]);
assert.strictEqual(spectral.profileId, 'spectral-preservation', 'high-loss risk must select spectral profile');
assert(spectral.safeSettings.metallicRemoval <= 32 && spectral.safeSettings.clarity <= 50, 'spectral profile must reduce over-processing');
assert.strictEqual(spectral.targetLufs, -9, 'spectral-only recovery should not unnecessarily lower loudness target');

const pumping = planFor([
  { code: 'DYNAMIC_COLLAPSE', label: '과도한 리미팅' },
  { code: 'LOW_PUMPING', label: '저역 펌핑' }
]);
assert.strictEqual(pumping.profileId, 'loudness-relief', 'loudness profile must lead combined dynamic failures');
assert(pumping.profileIds.includes('low-end-control'), 'combined low-end profile missing');
assert(pumping.safeSettings.dynamicPunch <= 18 && pumping.safeSettings.analogGroove <= 4, 'combined dynamic profile must apply both safety modifiers');
assert(pumping.targetLufs <= -12 && pumping.ceilingDb <= -1.8, 'dynamic recovery must create loudness headroom');

const integrity = planFor([{ code: 'INVALID_OUTPUT', label: '출력 샘플 무결성' }]);
assert.strictEqual(integrity.profileId, 'integrity-reset', 'invalid output must select integrity reset');
assert(integrity.targetLufs <= -14 && integrity.ceilingDb <= -2, 'integrity reset must use the strongest headroom');
assert(integrity.safeSettings.intensity <= 80 && integrity.safeSettings.width <= 24, 'integrity reset settings are not conservative enough');
assert(integrity.adjustments.length >= 5, 'recovery plan should expose concrete setting adjustments');
assert.strictEqual(service.createQualityRecoveryPlan({ gate: makeGate([{ code: 'PHASE_RISK', label: '위상' }]), alreadyAttempted: true }), null, 'one-shot retry contract regressed');

const labelFallback = planFor([{ label: 'De-esser 과보정', code: '' }]);
assert.strictEqual(labelFallback.profileId, 'spectral-preservation', 'label fallback classification missing');

assert(qualitySource.includes("code: String(item.meta?.code || '')"), 'quality risk flags must preserve audit codes');
assert(appSource.includes('applyQualityRecoveryE2EOverride') && appSource.includes('window.__FOXBEAR_E2E__ !== true'), 'E2E recovery injection must be explicitly guarded');
assert(appSource.includes("maybeThrowQualityRecoveryE2E('after-render')") && appSource.includes("maybeThrowQualityRecoveryE2E('after-finalizer')") && appSource.includes("maybeThrowQualityRecoveryE2E('after-encode')"), 'recovery exception stage injection coverage missing');
assert(appSource.includes('preservedFirstRender: true') && appSource.includes('recoveryProfileId') && appSource.includes('outputBytes'), 'recovery preservation diagnostics missing');
assert(detailSource.includes('profileLabel') && detailSource.includes('최초 렌더 유지'), 'risk-specific recovery UI missing');
assert(browserSpec.includes('phase-stabilization') && browserSpec.includes('spectral-preservation'), 'browser recovery profile assertions missing');
assert(browserSpec.includes("throwAt: 'after-render'") && browserSpec.includes('outputBytes'), 'browser first-render preservation scenario missing');

console.log('PASS v1.5.54 risk-specific quality recovery and browser QA smoke');
