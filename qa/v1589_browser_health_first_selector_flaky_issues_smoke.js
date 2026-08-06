#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ALL_BROWSER_SPECS,
  extractCssSelectorTokens,
  selectBrowserScope
} = require('./browser/select-browser-scope');
const {
  RUNTIME_HEALTH_SPEC,
  buildHealthFirstPlan,
  executeHealthFirstPlan
} = require('./browser/run-browser-health-first');
const {
  renderFlakyIssueMarkdown,
  summarizeFlakyHistory,
  updateFlakyHistory,
  writeFlakyHistoryArtifacts
} = require('./browser/flaky-history');
const { FIXTURE_CONTRACTS, scanFixtureContracts } = require('./browser/fixture-contract-preflight');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const fullPlan = buildHealthFirstPlan({ allSpecs: ALL_BROWSER_SPECS });
assert.strictEqual(fullPlan.mode, 'health-first');
assert.deepStrictEqual(fullPlan.sentinel, [RUNTIME_HEALTH_SPEC]);
assert.strictEqual(fullPlan.remaining.length, ALL_BROWSER_SPECS.length - 1);
assert(!fullPlan.remaining.includes(RUNTIME_HEALTH_SPEC));

const healthOnly = buildHealthFirstPlan({ selectedSpecs: RUNTIME_HEALTH_SPEC });
assert.strictEqual(healthOnly.mode, 'health-only');
assert.strictEqual(healthOnly.remaining.length, 0);

const selectedPlan = buildHealthFirstPlan({ selectedSpecs: 'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js' });
const phaseCalls = [];
const failedStatus = executeHealthFirstPlan(selectedPlan, {
  stdio: 'pipe',
  spawnSync(command, args) {
    phaseCalls.push({ command, args });
    return { status: 1 };
  }
});
assert.strictEqual(failedStatus, 1);
assert.strictEqual(phaseCalls.length, 1, 'heavy browser phase must not run after Runtime Health failure');

phaseCalls.length = 0;
const passedStatus = executeHealthFirstPlan(selectedPlan, {
  stdio: 'pipe',
  spawnSync(command, args) {
    phaseCalls.push({ command, args });
    return { status: 0 };
  }
});
assert.strictEqual(passedStatus, 0);
assert.strictEqual(phaseCalls.length, 2);
assert(phaseCalls[0].args.includes(RUNTIME_HEALTH_SPEC));
assert(phaseCalls[1].args.includes('qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'));

const pwaImpact = selectBrowserScope(['src/boot/service-worker-update-service.js']);
assert.strictEqual(pwaImpact.mode, 'selected');
assert.deepStrictEqual(pwaImpact.specs, [
  'qa/browser/pwa-back-wakelock-sw-playwright.spec.js',
  'qa/browser/runtime-health-playwright.spec.js'
]);

const adminImpact = selectBrowserScope(['src/ui/admin-incident-monitor-view.js']);
assert.strictEqual(adminImpact.mode, 'selected');
assert.deepStrictEqual(adminImpact.specs, ['qa/browser/runtime-health-playwright.spec.js']);

const cssTokens = extractCssSelectorTokens([
  '@@ -10,3 +10,3 @@',
  '-.download-options-panel-v1574 .download-format-option {',
  '+.download-options-panel-v1574.is-open .download-format-option {',
  '  padding: 8px;'
].join('\n'));
assert(cssTokens.includes('.download-options-panel-v1574'));
assert(cssTokens.includes('.download-format-option'));
const cssImpact = selectBrowserScope(['assets/css/studio.css'], {
  changedCssSelectors: { 'assets/css/studio.css': cssTokens.filter(token => !token.includes('is-open')) }
});
assert.strictEqual(cssImpact.mode, 'selected');
assert(cssImpact.specs.includes('qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'));
const unknownCssImpact = selectBrowserScope(['assets/css/studio.css'], {
  changedCssSelectors: { 'assets/css/studio.css': ['.new-unmapped-surface'] }
});
assert.strictEqual(unknownCssImpact.mode, 'full');

let history = { version: 1, entries: {} };
for (let index = 0; index < 3; index += 1) {
  history = updateFlakyHistory(history, {
    recovered: [{ key: 'flaky-a', file: 'qa/browser/a.spec.js', title: 'flaky A', projectName: 'chromium-desktop' }],
    repeated: [],
    missing: []
  }, { now: `2026-07-23T0${index}:00:00.000Z` });
}
history = updateFlakyHistory(history, {
  recovered: [],
  repeated: [{ key: 'broken-b', file: 'qa/browser/b.spec.js', title: 'broken B', projectName: 'chromium-mobile-pwa' }],
  missing: []
}, { now: '2026-07-23T04:00:00.000Z' });
const flakySummary = summarizeFlakyHistory(history, { warningThreshold: 3 });
assert.strictEqual(flakySummary.issueCandidates[0].key, 'broken-b');
const issueMarkdown = renderFlakyIssueMarkdown(flakySummary);
assert(issueMarkdown.includes('P1 unresolved'));
assert(issueMarkdown.includes('P2 recurring flaky'));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1589-'));
const written = writeFlakyHistoryArtifacts({ recovered: [], repeated: [], missing: [] }, {
  historyPath: path.join(temp, 'history.json'),
  jsonOutputPath: path.join(temp, 'summary.json'),
  markdownOutputPath: path.join(temp, 'summary.md'),
  issueOutputPath: path.join(temp, 'issue.md')
});
assert(fs.existsSync(written.issueOutputPath));
fs.rmSync(temp, { recursive: true, force: true });

const contractNames = FIXTURE_CONTRACTS.map(item => item.name);
assert(contractNames.includes('admin-operations-panel'));
assert(contractNames.includes('quality-recovery-diagnostics'));
assert.strictEqual(scanFixtureContracts().length, 0);

const packageJson = JSON.parse(read('package.json'));
assert.strictEqual(packageJson.version, '1.6.65');
assert.strictEqual(packageJson.scripts['qa:browser'], 'node qa/browser/run-browser-health-first.js');
assert(/^[a-z0-9][a-z0-9-]*$/.test(packageJson.foxbearRelease.buildId));

console.log('PASS v1.5.89 browser health-first, selector impact mapping, and flaky issue reporting');
