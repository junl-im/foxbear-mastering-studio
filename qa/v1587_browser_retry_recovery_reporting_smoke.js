#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildRetryRecoverySummary,
  renderRetryRecoveryMarkdown,
  writeRetryRecoveryArtifacts
} = require('./browser/retry-recovery-report');
const { FIXTURE_CONTRACTS, scanFixtureContracts } = require('./browser/fixture-contract-preflight');

function report(entries) {
  return {
    suites: [{
      title: 'qa/browser/example.spec.js',
      file: 'qa/browser/example.spec.js',
      specs: entries.map(entry => ({
        title: entry.title,
        file: 'qa/browser/example.spec.js',
        tests: [{
          projectName: entry.project,
          status: entry.passed ? 'expected' : 'unexpected',
          results: [{
            status: entry.passed ? 'passed' : 'failed',
            duration: entry.duration || 10,
            errors: entry.passed ? [] : [{ message: entry.error || 'synthetic failure' }]
          }]
        }]
      }))
    }]
  };
}

const primary = report([
  { title: 'recovers', project: 'chromium-desktop', passed: false, error: 'first failure' },
  { title: 'repeats', project: 'chromium-mobile-pwa', passed: false, error: 'primary repeat' },
  { title: 'missing', project: 'chromium-desktop', passed: false, error: 'primary missing' },
  { title: 'already healthy', project: 'chromium-desktop', passed: true }
]);
const retry = report([
  { title: 'recovers', project: 'chromium-desktop', passed: true },
  { title: 'repeats', project: 'chromium-mobile-pwa', passed: false, error: 'retry repeat' }
]);
const summary = buildRetryRecoverySummary(primary, retry);
assert.deepStrictEqual(summary.counts, {
  primaryFailures: 3,
  recovered: 1,
  repeated: 1,
  skippedRetryResults: 0,
  missingRetryResults: 1
});
assert.strictEqual(summary.healthy, false);
const markdown = renderRetryRecoveryMarkdown(summary);
assert(markdown.includes('Recovered flaky cases'));
assert(markdown.includes('Repeated failures'));
assert(markdown.includes('Missing retry results'));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-retry-report-'));
const primaryPath = path.join(temp, 'primary.json');
const retryPath = path.join(temp, 'retry.json');
const jsonPath = path.join(temp, 'summary.json');
const markdownPath = path.join(temp, 'summary.md');
const stepSummary = path.join(temp, 'github-summary.md');
fs.writeFileSync(primaryPath, JSON.stringify(primary));
fs.writeFileSync(retryPath, JSON.stringify(retry));
const written = writeRetryRecoveryArtifacts({
  primaryPath,
  retryPath,
  jsonOutputPath: jsonPath,
  markdownOutputPath: markdownPath,
  historyPath: path.join(temp, 'history.json'),
  flakyJsonOutputPath: path.join(temp, 'flaky-summary.json'),
  flakyMarkdownOutputPath: path.join(temp, 'flaky-summary.md'),
  flakyIssueOutputPath: path.join(temp, 'flaky-issue.md'),
  githubStepSummary: stepSummary
});
assert.strictEqual(written.summary.counts.recovered, 1);
assert(fs.existsSync(jsonPath));
assert(fs.readFileSync(stepSummary, 'utf8').includes('Browser retry recovery'));
fs.rmSync(temp, { recursive: true, force: true });

const contractNames = FIXTURE_CONTRACTS.map(item => item.name);
assert(contractNames.includes('runtime-health-release-header'));
assert(contractNames.includes('pwa-runtime-recovery'));
assert.strictEqual(scanFixtureContracts().length, 0);

const pkg = require('../package.json');
assert.strictEqual(pkg.version, '1.6.76');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId));
assert.strictEqual(pkg.scripts['qa:browser:retry:report'], 'node qa/browser/retry-recovery-report.js');

const workflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pages.yml'), 'utf8');
const fallback = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pages-branch-fallback.yml'), 'utf8');
for (const source of [workflow, fallback]) {
  assert(source.includes('Summarize browser retry recovery'));
  assert(source.includes('npm run qa:browser:retry:report'));
  assert(source.includes('if: always() &&') && source.includes("steps.browser_primary.outcome == 'failure'"));
}

console.log('PASS v1.5.87 browser retry recovery reporting and expanded fixture contracts');
