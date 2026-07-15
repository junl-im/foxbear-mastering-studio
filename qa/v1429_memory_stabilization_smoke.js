#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.4.29 memory stabilization smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const memory = read('src/audio/memory-guard-service.js');
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');

assert(pkg.qaChecks.includes('node qa/v1429_memory_stabilization_smoke.js'), 'v1.4.29 smoke missing from package QA');
assert(pkg.qaChecks.includes('node --check src/audio/memory-guard-service.js'), 'memory guard syntax check missing');

assert(memory.includes('v1.4.29-memory-stabilization'), 'memory service version not updated');
assert(memory.includes('normalizePolicy'), 'dynamic policy normalizer missing');
assert(memory.includes('maxMasteredBufferBytes'), 'mastered-buffer byte budget missing');
assert(memory.includes('largeBatch'), 'large-batch policy flag missing');
assert(memory.includes('lowMemory'), 'low-memory policy flag missing');
assert(memory.includes('pressure'), 'memory pressure diagnostic missing');
assert(memory.includes('largestMasteredBuffers'), 'largest retained buffers diagnostic missing');
assert(memory.includes('diagnoseCompletedBatch'), 'completed-batch diagnostic sweep missing');
assert(memory.includes('releasedCompletedBufferCount'), 'released completed buffer count missing from snapshot');

assert(app.includes('getMasteringMemoryPolicyOptions'), 'app memory policy options bridge missing');
assert(app.includes('afterMasteringBatchMemorySweep'), 'post-batch memory sweep missing');
assert(app.includes('FoxBearMemoryGuard = Object.freeze'), 'memory guard global bridge missing');
assert(app.includes('diagnose: diagnoseCompletedMasteringMemory'), 'FoxBearMemoryGuard.diagnose bridge missing');
assert(app.includes('afterBatch: afterMasteringBatchMemorySweep'), 'mastering orchestrator afterBatch hook missing');
assert(app.includes('performanceInfo.masteredBufferBytes'), 'performance masteredBufferBytes metadata missing');
assert(app.includes('performanceInfo.outBlobBytes'), 'performance outBlobBytes metadata missing');
assert(app.includes('retainCompletedPcm: false') && app.includes('maxRetainedBuffers: 0'), 'release-after-encode zero-retention policy not bridged');

assert((readme.includes('v1.5.2 Export Guard + Low Memory UX') || readme.includes('v1.5.1 Real Browser Automation') || readme.includes('v1.5.0 Engine Quality Gate')) && readme.includes('v1.4.29 Memory Stabilization'), 'README missing v1.5.0 and v1.4.29 carry-forward');
assert((handoff.includes('v1.5.2 Export Guard + Low Memory UX') || handoff.includes('v1.5.1 Real Browser Automation') || handoff.includes('v1.5.0 Engine Quality Gate')) && handoff.includes('v1.4.29 Memory Stabilization'), 'HANDOFF missing v1.5.0 and v1.4.29 carry-forward');
assert(qaReport.includes('183/183 PASS') || qaReport.includes('182/182 PASS') || qaReport.includes('178/178 PASS'), 'QA report missing current PASS anchor');
assert(changelog.startsWith('# v') && changelog.includes('# v1.4.29 - Memory Stabilization'), 'CHANGELOG current heading or v1.4.29 history missing');
assert(app.split(/\r?\n/).length < 12950, 'app.js should remain under the v1.4.28 slim-down line budget');

console.log('PASS v1.4.29 memory stabilization smoke');
