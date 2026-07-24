#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ALL_BROWSER_SPECS,
  selectBrowserScope,
  writeScopeArtifacts
} = require('./browser/select-browser-scope');
const {
  buildPlaywrightArgs,
  parseSelectedBrowserSpecs
} = require('./browser/run-browser-e2e');
const {
  renderFlakyHistoryMarkdown,
  summarizeFlakyHistory,
  updateFlakyHistory,
  writeFlakyHistoryArtifacts
} = require('./browser/flaky-history');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const docsOnly = selectBrowserScope(['README.md', 'docs/V1.5.87_BROWSER_RETRY_RECOVERY_REPORTING.md']);
assert.strictEqual(docsOnly.mode, 'skip');
assert.strictEqual(docsOnly.runBrowser, false);
assert.deepStrictEqual(docsOnly.specs, []);

const backendOnly = selectBrowserScope(['functions/index.js', 'firestore.rules', 'qa/v1587_browser_retry_recovery_reporting_smoke.js']);
assert.strictEqual(backendOnly.mode, 'skip');
assert.strictEqual(backendOnly.runBrowser, false);

const downloadImpact = selectBrowserScope(['src/ui/download-dialog-view.js']);
assert.strictEqual(downloadImpact.mode, 'selected');
assert.deepStrictEqual(downloadImpact.specs, [
  'qa/browser/bulk-35-import-master-export-playwright.spec.js',
  'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'
]);

const directSpec = selectBrowserScope(['qa/browser/runtime-health-playwright.spec.js']);
assert.strictEqual(directSpec.mode, 'selected');
assert.deepStrictEqual(directSpec.specs, ['qa/browser/runtime-health-playwright.spec.js']);

const coreImpact = selectBrowserScope(['src/app.js']);
assert.strictEqual(coreImpact.mode, 'full');
assert.deepStrictEqual(coreImpact.specs, [...ALL_BROWSER_SPECS]);

const unknownImpact = selectBrowserScope(['assets/css/new-unknown-surface.css']);
assert.strictEqual(unknownImpact.mode, 'full');
assert(unknownImpact.reasons[0].includes('Unmapped'));

assert.deepStrictEqual(
  parseSelectedBrowserSpecs('qa/browser/v1574-mobile-download-batch-controls-visual.spec.js qa/browser/runtime-health-playwright.spec.js'),
  ['qa/browser/runtime-health-playwright.spec.js', 'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js']
);
assert.deepStrictEqual(
  buildPlaywrightArgs('/tmp/playwright-cli', [], {
    selectedSpecs: 'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js qa/browser/runtime-health-playwright.spec.js'
  }),
  [
    '/tmp/playwright-cli',
    'test',
    'qa/browser/runtime-health-playwright.spec.js',
    'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'
  ]
);
assert.deepStrictEqual(
  buildPlaywrightArgs('/tmp/playwright-cli', ['--last-failed'], {
    selectedSpecs: 'qa/browser/runtime-health-playwright.spec.js'
  }),
  ['/tmp/playwright-cli', 'test', '--last-failed']
);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1588-'));
const outputFile = path.join(temp, 'github-output.txt');
const summaryFile = path.join(temp, 'github-summary.md');
const impactFile = path.join(temp, 'impact.json');
writeScopeArtifacts(downloadImpact, {
  outputPath: impactFile,
  githubOutput: outputFile,
  githubSummary: summaryFile
});
const outputText = fs.readFileSync(outputFile, 'utf8');
assert(outputText.includes('run_browser=true'));
assert(outputText.includes('mode=selected'));
assert(outputText.includes('v1574-mobile-download-batch-controls-visual.spec.js'));
assert(fs.readFileSync(summaryFile, 'utf8').includes('Browser QA impact scope'));

const retrySummary = {
  recovered: [{ key: 'case-a', file: 'qa/browser/a.spec.js', title: 'case A › chromium', projectName: 'chromium' }],
  repeated: [],
  missing: []
};
let history = updateFlakyHistory({ version: 1, entries: {} }, retrySummary, { now: '2026-07-23T00:00:00.000Z' });
history = updateFlakyHistory(history, retrySummary, { now: '2026-07-23T01:00:00.000Z' });
history = updateFlakyHistory(history, retrySummary, { now: '2026-07-23T02:00:00.000Z' });
let historySummary = summarizeFlakyHistory(history, { warningThreshold: 3 });
assert.strictEqual(historySummary.counts.recurringRecovered, 1);
assert.strictEqual(historySummary.recurringRecovered[0].recoveredCount, 3);
assert(renderFlakyHistoryMarkdown(historySummary).includes('Recurring flaky recoveries'));

history = updateFlakyHistory(history, {
  recovered: [],
  repeated: [{ key: 'case-a', file: 'qa/browser/a.spec.js', title: 'case A › chromium', projectName: 'chromium' }],
  missing: []
}, { now: '2026-07-23T03:00:00.000Z' });
historySummary = summarizeFlakyHistory(history, { warningThreshold: 3 });
assert.strictEqual(historySummary.counts.unresolved, 1);
assert.strictEqual(history.entries['case-a'].consecutiveRecoveries, 0);

const historyPath = path.join(temp, 'history', 'flaky-history.json');
const historyJson = path.join(temp, 'results', 'flaky-history-summary.json');
const historyMd = path.join(temp, 'results', 'flaky-history-summary.md');
const written = writeFlakyHistoryArtifacts(retrySummary, {
  historyPath,
  jsonOutputPath: historyJson,
  markdownOutputPath: historyMd,
  issueOutputPath: path.join(temp, 'results', 'flaky-issue.md'),
  githubStepSummary: summaryFile,
  warningThreshold: 1,
  now: '2026-07-23T04:00:00.000Z'
});
assert.strictEqual(written.summary.counts.recurringRecovered, 1);
assert(fs.existsSync(historyPath));
assert(fs.existsSync(historyJson));
assert(fs.existsSync(historyMd));

const packageJson = JSON.parse(read('package.json'));
assert(/^[a-z0-9][a-z0-9-]*$/.test(packageJson.foxbearRelease.buildId));
assert.strictEqual(packageJson.scripts['qa:browser:impact'], 'node qa/browser/select-browser-scope.js');

const workflow = read('.github/workflows/pages.yml');
const fallback = read('.github/workflows/pages-branch-fallback.yml');
for (const source of [workflow, fallback]) {
  assert(source.includes('Select browser QA impact scope'));
  assert(source.includes("if: steps.browser_scope.outputs.run_browser == 'true'"));
  assert(source.includes('FOXBEAR_BROWSER_SPECS: ${{ steps.browser_scope.outputs.specs }}'));
  assert(source.includes('Restore browser flaky history'));
  assert(source.includes('Save updated browser flaky history'));
}
const selectorIndex = workflow.indexOf('Select browser QA impact scope');
const installIndex = workflow.indexOf('Install pinned dependencies', selectorIndex);
const chromiumIndex = workflow.indexOf('Install Chromium and system dependencies');
assert(selectorIndex >= 0 && selectorIndex < installIndex && selectorIndex < chromiumIndex, 'impact selection must happen before dependency and Chromium installation');

assert(read('.gitignore').includes('qa/browser-history/'));
assert(read('tools/create-release-zip.sh').includes("-x 'qa/browser-history/*'"));
assert(read('tools/create-overwrite-zip.sh').includes('$WORK_DIR/qa/browser-history'));

fs.rmSync(temp, { recursive: true, force: true });
console.log('PASS v1.5.88 browser impact selection and cumulative flaky history');
