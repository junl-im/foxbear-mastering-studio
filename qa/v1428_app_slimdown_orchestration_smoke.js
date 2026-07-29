#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.4.28 app slim-down orchestration smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const index = read('index.html');
const sw = read('sw.js');
const importQueue = read('src/audio/import-queue-service.js');
const orchestrator = read('src/audio/mastering-orchestrator-service.js');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');

assert(fs.existsSync(path.join(root, 'src/audio/mastering-orchestrator-service.js')), 'mastering orchestrator service missing');
assert(pkg.qaChecks.includes('node --check src/audio/mastering-orchestrator-service.js'), 'mastering orchestrator syntax check missing');
assert(pkg.qaChecks.includes('node qa/v1428_app_slimdown_orchestration_smoke.js'), 'v1428 app slim-down smoke missing from package QA');
assert(index.includes('src/audio/mastering-orchestrator-service.js?v=1.6.34-history-hard-stall-sw-activity-lifecycle'), 'mastering orchestrator not loaded in index');
assert(index.indexOf('src/audio/mastering-orchestrator-service.js') < index.indexOf('src/app.js'), 'mastering orchestrator must load before app.js');
assert(sw.includes('./src/audio/mastering-orchestrator-service.js?v=1.6.34-history-hard-stall-sw-activity-lifecycle'), 'mastering orchestrator not precached');
assert(importQueue.includes('createTrackAnalysisQueue'), 'track-specific import queue orchestration missing');
assert(importQueue.includes('runTrack(track)'), 'import queue should own per-track analysis execution');
assert(app.includes('getImportAnalysisQueueController().queueTracks'), 'app should delegate queueTracksForAnalysis to service controller');
assert(app.includes('getImportAnalysisQueueController().runPump'), 'app should delegate runImportAnalysisPump to service controller');
assert(orchestrator.includes('createMasteringBatchRunner'), 'mastering batch runner factory missing');
assert(orchestrator.includes('runBatch'), 'mastering orchestrator should expose runBatch');
assert(app.includes('getMasteringBatchRunner().runBatch(candidates'), 'masterSelected/masterAll should delegate to mastering batch runner');
assert(app.split(/\r?\n/).length < 13300, 'app.js should remain under the v1.6.34 adaptive governor integration line budget');
assert(changelog.includes('v1.4.28') && handoff.includes('v1.4.29') && /\b(\d+)\/\1 PASS\b/.test(qaReport), 'docs should carry forward v1.4.28 and report a self-consistent QA count');

console.log('PASS v1.4.28 app slim-down orchestration smoke');
