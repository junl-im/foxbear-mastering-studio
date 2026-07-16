#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.5.0 engine quality gate smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const gate = read('src/audio/quality-gate-service.js');
const ref = read('src/audio/reference-profile-service.js');
const worker = read('src/workers/master-finalizer.worker.js');
const index = read('index.html');
const sw = read('sw.js');
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

assert(pkg.qaChecks.includes('node --check src/audio/reference-profile-service.js'), 'reference profile syntax check missing');
assert(pkg.qaChecks.includes('node qa/v150_engine_quality_gate_smoke.js'), 'v1.5.0 smoke missing from package QA');
assert(index.includes('src/audio/reference-profile-service.js?v=1.5.26-engraved-command-header'), 'reference profile service not loaded in index');
assert(index.indexOf('src/audio/reference-profile-service.js') < index.indexOf('src/audio/quality-gate-service.js'), 'reference profile service should load before quality gate');
assert(sw.includes('./src/audio/reference-profile-service.js?v=1.5.26-engraved-command-header'), 'reference profile service not precached');

assert(gate.includes('QualityGate v2.1'), 'QualityGate v2.1 label missing');
assert(gate.includes('shortTermOverTargetWarnDb'), 'short-term LUFS rules missing');
assert(gate.includes('Limiter 과보정'), 'limiter overdose check missing');
assert(gate.includes('De-esser 과보정'), 'de-esser overdose check missing');
assert(gate.includes('모바일 번역 보정량'), 'mobile translation amount check missing');
assert(gate.includes('riskFlags'), 'risk flag summary missing');
assert(gate.includes('1.5.0-engine-quality-gate'), 'quality gate service version missing');

assert(app.includes('measureShortTermLufsStats'), 'short-term LUFS stats helper missing from app');
assert(app.includes('shortTermBefore'), 'master report shortTermBefore missing');
assert(app.includes('shortTermAfter'), 'master report shortTermAfter missing');
assert(app.includes("standard: 'approx short-term K-weighted LUFS, 3s window / 1s hop'"), 'master report short-term standard missing');
assert(app.includes('const shortTermLufs = measureShortTermLufsStats(working)'), 'fallback finalizer shortTermLufs telemetry missing');
assert(app.split(/\r?\n/).length < 12950, 'app.js should stay below slim-down line budget');

assert(worker.includes('shortTermLufs'), 'worker shortTermLufs telemetry missing');
assert(worker.includes('measureShortTermLufsStatsBuffers'), 'worker short-term LUFS helper missing');
assert(worker.includes('v1.5.0'), 'worker header not updated to v1.5.0');

assert(ref.includes('createLogBands') && ref.includes('makeProfileFromBands') && ref.includes('compareProfiles'), 'reference profile service helpers missing');
assert(ref.includes('1.5.0-reference-profile-64-96'), 'reference profile service version missing');

assert(readme.includes('Engine Quality Gate additions') || readme.includes('v1.5.0 Engine Quality Gate'), 'README missing engine quality gate carry-forward');
assert(handoff.includes('v1.5.0 Engine Quality Gate') || handoff.includes('QualityGate v2.1'), 'HANDOFF missing engine quality gate carry-forward');
assert(qaReport.includes('183/183 PASS') || qaReport.includes('182/182 PASS') || qaReport.includes('178/178 PASS'), 'QA report missing current PASS anchor');
assert(changelog.startsWith('# v') && changelog.includes('# v1.5.0 - Engine Quality Gate'), 'CHANGELOG current heading or v1.5.0 history missing');

console.log('PASS v1.5.0 engine quality gate smoke');
