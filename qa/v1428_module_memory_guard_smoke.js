#!/usr/bin/env node
'use strict';

const fs = require('fs');
const pkg = require('../package.json');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const app = read('src/app.js');
const index = read('index.html');
const perf = read('src/boot/performance-diagnostics.js');
const modules = [
  'src/audio/import-queue-service.js',
  'src/audio/analysis-cache-service.js',
  'src/audio/memory-guard-service.js',
  'src/audio/quality-gate-service.js',
  'src/state/track-lifecycle-service.js'
];
modules.forEach(path => assert(fs.existsSync(path), `${path} missing`));
modules.forEach(path => assert(index.includes(`${path}?v=1.6.4-incident-callable-csp-recovery`), `${path} not loaded in index`));
modules.forEach(path => assert(pkg.qaChecks.includes(`node --check ${path}`), `${path} syntax check missing`));

assert(index.indexOf('src/audio/import-queue-service.js') < index.indexOf('src/app.js'), 'import queue service must load before app.js');
assert(index.indexOf('src/audio/memory-guard-service.js') < index.indexOf('src/app.js'), 'memory guard service must load before app.js');
assert(app.includes('window.FoxBearMemoryGuard = Object.freeze'), 'FoxBearMemoryGuard global bridge missing');
assert(app.includes('applyCompletedMasteringMemoryPolicy(calledFromBatch'), 'completed master memory policy is not applied');
assert(app.includes('service.read(track, getAnalysisCacheOptions())'), 'analysis cache read bridge missing');
assert(app.includes('service.write(track, analysis, getAnalysisCacheOptions())'), 'analysis cache write bridge missing');
assert(app.includes('lifecycle.createTrackModel'), 'track lifecycle create bridge missing');
assert(app.includes('lifecycle.releaseTrackResources'), 'track lifecycle cleanup bridge missing');
assert(app.includes('service.createReport({'), 'QualityGate v2 bridge missing');
assert(perf.includes('memoryGuard'), 'performance diagnostics does not include memoryGuard snapshot');

const memoryService = read('src/audio/memory-guard-service.js');
assert(memoryService.includes('releaseCompletedMasteredBuffers'), 'memory guard release policy missing');
assert(memoryService.includes('getSnapshot'), 'memory guard snapshot missing');

console.log('PASS v1.4.28 module memory guard smoke');
