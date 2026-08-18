#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildRetryRecoverySummary } = require('./browser/retry-recovery-report');
const { summarizeFlakyHistory, updateFlakyHistory } = require('./browser/flaky-history');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const runtimeSpec = read('qa/browser/runtime-health-playwright.spec.js');

assert(runtimeSpec.includes('const CSS_LAYOUT_QUANTUM_PX = 1 / 64;'), 'browser geometry must use one Chromium CSS layout quantum');
assert(runtimeSpec.includes('const HEADER_CENTER_SPREAD_LIMIT_PX = 8;'), '8px header center-spread design target must remain explicit');
assert(runtimeSpec.includes('centerSpreadExcess'), 'header center-spread guard must assert only the sub-pixel excess');
assert(runtimeSpec.includes('toBeLessThanOrEqual(CSS_LAYOUT_QUANTUM_PX)'), 'header geometry tolerance must not exceed one layout quantum');
assert(runtimeSpec.includes('centerPositions'), 'browser failure diagnostics must retain named header center positions');
assert((8.0078125 - 8) <= (1 / 64), 'observed Chromium half-quantum center spread must fit one layout quantum');
assert((8.02 - 8) > (1 / 64), 'real geometry movement beyond one layout quantum must still fail');

function report(entries) {
  return {
    suites: [{
      title: 'qa/browser/runtime-health-playwright.spec.js',
      file: 'qa/browser/runtime-health-playwright.spec.js',
      specs: entries.map(entry => ({
        title: entry.title,
        file: 'qa/browser/runtime-health-playwright.spec.js',
        tests: [{
          projectName: entry.project || 'chromium-desktop',
          expectedStatus: 'passed',
          status: entry.status === 'passed' ? 'expected' : 'unexpected',
          results: [{ status: entry.status, duration: 10, errors: entry.status === 'failed' ? [{ message: 'synthetic failure' }] : [] }]
        }]
      }))
    }]
  };
}

const trackedKey = 'qa/browser/runtime-health-playwright.spec.js::qa/browser/runtime-health-playwright.spec.js › runtime health › chromium-desktop';
let history = updateFlakyHistory({ version: 2, entries: {} }, {
  recovered: [],
  repeated: [{
    key: trackedKey,
    file: 'qa/browser/runtime-health-playwright.spec.js',
    title: 'qa/browser/runtime-health-playwright.spec.js › runtime health › chromium-desktop',
    projectName: 'chromium-desktop'
  }],
  skipped: [],
  missing: []
}, { now: '2026-08-18T05:42:14.000Z' });
assert.strictEqual(summarizeFlakyHistory(history).counts.unresolved, 1, 'synthetic repeated case should begin unresolved');

const primaryPassReport = report([{ title: 'runtime health', status: 'passed' }]);
const retryEmptyReport = report([]);
const summary = buildRetryRecoverySummary(primaryPassReport, retryEmptyReport);
assert.strictEqual(summary.primaryPassed.length, 1, 'retry summary must expose real primary passes for history resolution');
const generatedKey = summary.primaryPassed[0].key;
assert(generatedKey.includes('runtime health'), 'primary-pass key should retain test identity');

// Seed the exact generated key so a subsequent clean primary pass resolves it.
history = updateFlakyHistory({ version: 2, entries: {} }, {
  recovered: [], repeated: [{ ...summary.primaryPassed[0] }], skipped: [], missing: []
}, { now: '2026-08-18T05:42:14.000Z' });
history = updateFlakyHistory(history, summary, { now: '2026-08-18T06:30:00.000Z' });
assert.strictEqual(history.entries[generatedKey].lastOutcome, 'primary-passed', 'tracked unresolved browser case must resolve after a real primary pass');
assert.strictEqual(summarizeFlakyHistory(history).counts.unresolved, 0, 'resolved primary pass must leave no stale unresolved annotation');

const freshPassOnly = updateFlakyHistory({ version: 2, entries: {} }, summary, { now: '2026-08-18T06:30:00.000Z' });
assert.strictEqual(Object.keys(freshPassOnly.entries).length, 0, 'healthy primary passes must not bloat flaky history');

console.log('PASS v1.6.106 browser geometry precision and flaky-history recovery');
