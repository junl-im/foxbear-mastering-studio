'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('src/audio/mastering-orchestrator-service.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(code, context);
const service = context.window.FoxBearMasteringOrchestratorService;
assert(service?.createAdaptiveDecisionPlan, 'mastering orchestrator must expose adaptive decision planning');

const base = { clarity: 62, warmth: 66, width: 62, stereoGroove: 18, analogGroove: 12, dynamicPunch: 66, metallicRemoval: 40, intensity: 135 };
const stressed = service.createAdaptiveDecisionPlan({ settings: base, analysis: { brightness: 0.79, metallicHint: 0.74, stereoWidth: 0.76, lowMonoScore: 61, spatialExcessRisk: 0.64, mobileSpeakerRisk: 0.58, bassRatio: 0.43, lowMidRatio: 0.37, highRatio: 0.38, presenceRatio: 0.27, transientDensity: 0.68, crest: 3.6, loudnessIntegrated: -8.5 } });
assert.strictEqual(stressed.candidates.length, 3);
assert(stressed.effectiveSettings.intensity <= base.intensity, 'stressed material must not raise intensity');
assert(stressed.effectiveSettings.width <= base.width, 'phase-risk material must not raise width');
assert(stressed.effectiveSettings.metallicRemoval >= base.metallicRemoval, 'harsh material should increase metallic protection');
assert(stressed.confidence >= 52 && stressed.confidence <= 96);

const clean = service.createAdaptiveDecisionPlan({ settings: { clarity: 50, warmth: 55, width: 32, stereoGroove: 8, analogGroove: 5, dynamicPunch: 34, metallicRemoval: 45, intensity: 100 }, analysis: { brightness: 0.48, metallicHint: 0.35, stereoWidth: 0.32, lowMonoScore: 96, spatialExcessRisk: 0.04, mobileSpeakerRisk: 0.06, bassRatio: 0.25, lowMidRatio: 0.23, highRatio: 0.22, transientDensity: 0.34, crest: 6.4, loudnessIntegrated: -17 } });
assert(clean.evaluation === undefined);
assert(clean.effectiveSettings.intensity >= 80, 'clean material should retain useful mastering drive');
assert(clean.riskLoad < stressed.riskLoad, 'clean material should have lower risk load');

const app = fs.readFileSync('src/app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
assert(!index.includes('adaptive-mastering-decision-service.js'), 'adaptive decision planning must not add another eager boot script');
assert(index.includes('src/audio/mastering-orchestrator-service.js?v=1.7.1-reference-match-2-phase1'), 'mastering orchestrator must load in the main shell');
assert(app.includes("track?.preset !== 'custom' && !track?.originalManualSelected"), 'custom/original manual mastering must bypass adaptive selection');
assert(app.includes('createAdaptiveMasteringDecisionForTrack(track, track.settings)'), 'normal mastering render must request an adaptive decision');
assert(app.includes('adaptiveDecision: adaptiveDecision ?'), 'master report must retain adaptive decision telemetry');

console.log('v1.7.0 adaptive mastering decision phase1 smoke: PASS');
