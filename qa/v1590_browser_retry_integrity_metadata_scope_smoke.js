#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  buildRetryRecoverySummary,
  renderRetryRecoveryMarkdown,
  writeRetryRecoveryArtifacts
} = require('./browser/retry-recovery-report');
const { verifyRetryRecoverySummary } = require('./browser/verify-retry-recovery');
const {
  detectMetadataOnlyFiles,
  isReleaseMetadataOnlyChange,
  releaseMetadataFromPackage,
  selectBrowserScope
} = require('./browser/select-browser-scope');
const { summarizeFlakyHistory, updateFlakyHistory, writeFlakyHistoryArtifacts } = require('./browser/flaky-history');

function report(entries) {
  return {
    suites: [{
      title: 'qa/browser/retry-integrity.spec.js',
      file: 'qa/browser/retry-integrity.spec.js',
      specs: entries.map(entry => ({
        title: entry.title,
        file: 'qa/browser/retry-integrity.spec.js',
        tests: [{
          projectName: entry.project || 'chromium-desktop',
          expectedStatus: 'passed',
          status: entry.status === 'passed' ? 'expected' : entry.status === 'skipped' ? 'skipped' : 'unexpected',
          results: [{
            status: entry.status,
            duration: 10,
            errors: entry.status === 'failed' ? [{ message: entry.error || 'synthetic failure' }] : []
          }]
        }]
      }))
    }]
  };
}

const primary = report([
  { title: 'real pass', status: 'failed' },
  { title: 'skipped retry', status: 'failed' }
]);
const retryWithSkip = report([
  { title: 'real pass', status: 'passed' },
  { title: 'skipped retry', status: 'skipped' }
]);
const incomplete = buildRetryRecoverySummary(primary, retryWithSkip);
assert.deepStrictEqual(incomplete.counts, {
  primaryFailures: 2,
  recovered: 1,
  repeated: 0,
  skippedRetryResults: 1,
  missingRetryResults: 0
});
assert.strictEqual(incomplete.healthy, false);
assert.strictEqual(incomplete.skipped.length, 1);
assert(renderRetryRecoveryMarkdown(incomplete).includes('Skipped retry cases'));
const incompleteVerification = verifyRetryRecoverySummary(incomplete);
assert.strictEqual(incompleteVerification.ok, false);
assert(incompleteVerification.errors.some(message => message.includes('skipped instead of passing')));

const retryPassed = report([
  { title: 'real pass', status: 'passed' },
  { title: 'skipped retry', status: 'passed' }
]);
const complete = buildRetryRecoverySummary(primary, retryPassed);
assert.strictEqual(complete.healthy, true);
assert.strictEqual(verifyRetryRecoverySummary(complete).ok, true);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1590-'));
const primaryPath = path.join(temp, 'reports', 'primary.json');
const retryPath = path.join(temp, 'reports', 'retry.json');
fs.mkdirSync(path.dirname(primaryPath), { recursive: true });
fs.writeFileSync(primaryPath, JSON.stringify(primary));
fs.writeFileSync(retryPath, JSON.stringify(retryWithSkip));
const written = writeRetryRecoveryArtifacts({
  primaryPath,
  retryPath,
  jsonOutputPath: path.join(temp, 'json', 'retry-summary.json'),
  markdownOutputPath: path.join(temp, 'markdown', 'nested', 'retry-summary.md'),
  historyPath: path.join(temp, 'history', 'flaky-history.json'),
  flakyJsonOutputPath: path.join(temp, 'flaky-json', 'summary.json'),
  flakyMarkdownOutputPath: path.join(temp, 'flaky-markdown', 'nested', 'summary.md'),
  flakyIssueOutputPath: path.join(temp, 'flaky-issue', 'nested', 'issue.md'),
  now: '2026-07-24T00:00:00.000Z'
});
assert(fs.existsSync(written.markdownOutputPath));
assert(fs.existsSync(written.flakyHistory.markdownOutputPath));
const cliVerify = spawnSync(process.execPath, [path.resolve(__dirname, 'browser/verify-retry-recovery.js'), written.jsonOutputPath], { encoding: 'utf8' });
assert.notStrictEqual(cliVerify.status, 0, 'skipped retry must block the release gate');
assert((cliVerify.stderr || '').includes('skipped instead of passing'));
const completeSummaryPath = path.join(temp, 'json', 'complete-summary.json');
fs.writeFileSync(completeSummaryPath, `${JSON.stringify(complete, null, 2)}\n`);
const cliPass = spawnSync(process.execPath, [path.resolve(__dirname, 'browser/verify-retry-recovery.js'), completeSummaryPath], { encoding: 'utf8' });
assert.strictEqual(cliPass.status, 0);
assert((cliPass.stdout || '').includes('PASS browser retry integrity'));

let history = updateFlakyHistory({ version: 1, entries: {} }, {
  recovered: [],
  repeated: [],
  skipped: [{ key: 'skip-case', file: 'qa/browser/a.spec.js', title: 'skip case', projectName: 'chromium-desktop' }],
  missing: []
}, { now: '2026-05-01T00:00:00.000Z', retentionDays: 45 });
history = updateFlakyHistory(history, { recovered: [], repeated: [], skipped: [], missing: [] }, {
  now: '2026-07-24T00:00:00.000Z',
  retentionDays: 45
});
assert.strictEqual(history.entries['skip-case'], undefined, 'stale flaky history must expire');
const historyWritten = writeFlakyHistoryArtifacts({ recovered: [], repeated: [], skipped: [], missing: [] }, {
  historyPath: path.join(temp, 'retention', 'history.json'),
  jsonOutputPath: path.join(temp, 'retention-json', 'summary.json'),
  markdownOutputPath: path.join(temp, 'retention-markdown', 'deep', 'summary.md'),
  issueOutputPath: path.join(temp, 'retention-issue', 'deep', 'issue.md'),
  now: '2026-07-24T00:00:00.000Z'
});
assert.strictEqual(summarizeFlakyHistory(historyWritten.history, { now: '2026-07-24T00:00:00.000Z' }).generatedAt, '2026-07-24T00:00:00.000Z');
assert(fs.existsSync(historyWritten.markdownOutputPath));

const beforePackage = {
  name: 'foxbear-mastering-studio',
  version: '1.6.2',
  description: 'old release',
  scripts: { check: 'node qa/run_all_checks.js', 'package:verify:release': 'node verify v1.6.2' },
  foxbearRelease: {
    buildId: 'old-build',
    assetVersion: '1.6.2-old-build',
    cacheName: 'foxbear-shell-v1.6.2-old-build',
    bootRevision: 'boot-sri-v1602',
    updateSafetyRevision: 'update-safety-v1602',
    serviceWorkerRevision: 'sw-v1602'
  }
};
const afterPackage = JSON.parse(JSON.stringify(beforePackage));
afterPackage.version = '1.6.2';
afterPackage.description = 'new release';
afterPackage.scripts['package:verify:release'] = 'node verify v1.6.2';
afterPackage.foxbearRelease = {
  buildId: 'new-build',
  assetVersion: '1.6.2-new-build',
  cacheName: 'foxbear-shell-v1.6.2-new-build',
  bootRevision: 'boot-sri-v1602',
  updateSafetyRevision: 'update-safety-v1602',
  serviceWorkerRevision: 'sw-v1602'
};
const beforeMetadata = releaseMetadataFromPackage(beforePackage);
const afterMetadata = releaseMetadataFromPackage(afterPackage);
assert.strictEqual(isReleaseMetadataOnlyChange('package.json', JSON.stringify(beforePackage), JSON.stringify(afterPackage), beforeMetadata, afterMetadata), true);
assert.strictEqual(isReleaseMetadataOnlyChange('src/app.js', "const version = '1.6.2-old-build';\nrun();\n", "const version = '1.6.2-new-build';\nrun();\n", beforeMetadata, afterMetadata), true);
assert.strictEqual(isReleaseMetadataOnlyChange('src/app.js', "const version = '1.6.2-old-build';\nrun();\n", "const version = '1.6.2-new-build';\nrunSafely();\n", beforeMetadata, afterMetadata), false);

const selected = selectBrowserScope([
  'package.json',
  'package-lock.json',
  'index.html',
  'sw.js',
  'src/ui/download-dialog-view.js'
], {
  metadataOnlyFiles: ['package.json', 'package-lock.json', 'index.html', 'sw.js']
});
assert.strictEqual(selected.mode, 'selected');
assert.deepStrictEqual(selected.specs, [
  'qa/browser/bulk-35-import-master-export-playwright.spec.js',
  'qa/browser/v1574-mobile-download-batch-controls-visual.spec.js'
]);

const gitDir = path.join(temp, 'git-metadata');
fs.mkdirSync(gitDir, { recursive: true });
const git = args => spawnSync('git', args, { cwd: gitDir, encoding: 'utf8' });
assert.strictEqual(git(['init', '-q']).status, 0);
assert.strictEqual(git(['config', 'user.email', 'qa@example.com']).status, 0);
assert.strictEqual(git(['config', 'user.name', 'FoxBear QA']).status, 0);
fs.writeFileSync(path.join(gitDir, 'package.json'), `${JSON.stringify(beforePackage, null, 2)}\n`);
fs.mkdirSync(path.join(gitDir, 'src'), { recursive: true });
fs.writeFileSync(path.join(gitDir, 'src/app.js'), "const build = '1.6.2-old-build';\n");
fs.writeFileSync(path.join(gitDir, 'index.html'), '<script src="src/app.js?v=1.6.2-old-build" integrity="sha384-OLD"></script>\n');
assert.strictEqual(git(['add', '.']).status, 0);
assert.strictEqual(git(['commit', '-qm', 'base']).status, 0);
const base = git(['rev-parse', 'HEAD']).stdout.trim();
fs.writeFileSync(path.join(gitDir, 'package.json'), `${JSON.stringify(afterPackage, null, 2)}\n`);
fs.writeFileSync(path.join(gitDir, 'src/app.js'), "const build = '1.6.2-new-build';\n");
fs.writeFileSync(path.join(gitDir, 'index.html'), '<script src="src/app.js?v=1.6.2-new-build" integrity="sha384-NEW"></script>\n');
assert.strictEqual(git(['add', '.']).status, 0);
assert.strictEqual(git(['commit', '-qm', 'metadata']).status, 0);
const head = git(['rev-parse', 'HEAD']).stdout.trim();
assert.deepStrictEqual(detectMetadataOnlyFiles(['package.json', 'src/app.js', 'index.html'], base, head, { cwd: gitDir }), [
  'index.html',
  'package.json',
  'src/app.js'
]);

const workflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pages.yml'), 'utf8');
const fallback = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pages-branch-fallback.yml'), 'utf8');
for (const source of [workflow, fallback]) {
  const reportIndex = source.indexOf('Summarize browser retry recovery');
  const verifyIndex = source.indexOf('Verify failed browser cases truly passed');
  assert(reportIndex >= 0 && verifyIndex > reportIndex);
  assert(source.includes('npm run qa:browser:retry:verify'));
}

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
assert.strictEqual(pkg.version, '1.6.2');
assert.strictEqual(pkg.scripts['qa:browser:retry:verify'], 'node qa/browser/verify-retry-recovery.js');
assert.strictEqual(pkg.scripts['sri:update'], 'python3 -B tools/update-sri.py');
assert(pkg.qaChecks.includes('python3 -B qa/verify_sri.py'));
assert(pkg.qaChecks.includes('python3 -B qa/v1527_header_device_sri_hardening_smoke.py'));
assert(fs.readFileSync(path.resolve(__dirname, '../tools/sync-release-metadata.js'), 'utf8').includes("['-B', 'tools/update-sri.py']"));
assert.strictEqual(fs.existsSync(path.resolve(__dirname, '__pycache__')), false, 'QA must not leave Python bytecode caches');
assert.strictEqual(fs.existsSync(path.resolve(__dirname, '../tools/__pycache__')), false, 'release tools must not leave Python bytecode caches');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId));

fs.rmSync(temp, { recursive: true, force: true });
console.log('PASS v1.5.90 browser retry integrity, metadata-aware impact scope, and stale flaky history cleanup');
