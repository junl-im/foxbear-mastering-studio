#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  archivePreviousBrowserResults,
  buildPlaywrightArgs,
  hasLastFailedFlag
} = require('./browser/run-browser-e2e');
const { runBrowserPreflight } = require('./browser/run-browser-preflight');
const { scanFixtureContracts } = require('./browser/fixture-contract-preflight');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/pages.yml');
const fallbackWorkflow = read('.github/workflows/pages-branch-fallback.yml');
const playwrightConfig = read('playwright.config.js');
const runner = read('qa/browser/run-browser-e2e.js');

assert.deepStrictEqual(runBrowserPreflight(), { safeSpecTree: true, fixtureContractsCurrent: true });
assert.strictEqual(hasLastFailedFlag(['--grep', 'visual']), false);
assert.strictEqual(hasLastFailedFlag(['--last-failed']), true);
assert.deepStrictEqual(
  buildPlaywrightArgs('/tmp/playwright-cli', []),
  ['/tmp/playwright-cli', 'test', 'qa/browser'],
  'normal browser run should target the complete browser directory'
);
assert.deepStrictEqual(
  buildPlaywrightArgs('/tmp/playwright-cli', ['--last-failed']),
  ['/tmp/playwright-cli', 'test', '--last-failed'],
  'last-failed retry must not append the full qa/browser target'
);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-fixture-contract-'));
fs.writeFileSync(path.join(tempRoot, 'index.html'), '<div id="present"></div>\n', 'utf8');
const violations = scanFixtureContracts({
  root: tempRoot,
  contracts: [{
    name: 'synthetic-contract',
    checks: [
      { file: 'index.html', type: 'markup-id', value: 'present' },
      { file: 'index.html', type: 'markup-id', value: 'missing' }
    ]
  }]
});
assert.strictEqual(violations.length, 1, 'fixture contract preflight did not detect stale markup');
assert.strictEqual(violations[0].code, 'FIXTURE_DOM_ID_MISSING');

const resultDir = path.join(tempRoot, 'results');
const outputDir = path.join(resultDir, 'artifacts');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(resultDir, 'results.json'), '{"primary":true}\n');
fs.writeFileSync(path.join(resultDir, 'static-server.log'), 'primary log\n');
fs.writeFileSync(path.join(outputDir, '.last-run.json'), '{"status":"failed"}\n');
const archived = archivePreviousBrowserResults({
  resultsDir: resultDir,
  lastRunPath: path.join(outputDir, '.last-run.json')
});
assert.deepStrictEqual(archived.sort(), ['last-run-primary.json', 'results-primary.json', 'static-server-primary.log']);
assert(fs.existsSync(path.join(resultDir, 'results-primary.json')), 'primary JSON report was not preserved');
assert(fs.existsSync(path.join(resultDir, 'last-run-primary.json')), 'last-run state was not preserved');
fs.rmSync(tempRoot, { recursive: true, force: true });

assert(/^\d+\.\d+\.\d+$/.test(pkg.version), 'current package version should remain semantic');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID should remain kebab-case');
assert.strictEqual(pkg.scripts['qa:browser:retry'], 'node qa/browser/run-browser-e2e.js --last-failed');
assert.strictEqual(pkg.scripts['qa:browser:preflight'], 'node qa/browser/run-browser-preflight.js');
assert(playwrightConfig.includes("outputDir: 'qa/browser-results/artifacts'"), 'Playwright artifacts should be isolated from durable reports');
assert(runner.includes("const LAST_RUN_PATH = path.join(PLAYWRIGHT_OUTPUT_DIR, '.last-run.json')"), 'runner does not use the durable last-failed path');

for (const source of [workflow, fallbackWorkflow]) {
  const preflight = source.indexOf('Run browser fixture preflight');
  const install = source.indexOf('Install Chromium');
  assert(preflight >= 0 && install >= 0 && preflight < install, 'CI preflight must run before Chromium installation');
  assert(source.includes('continue-on-error: true'), 'primary browser gate should allow the failed-only retry step');
  assert(source.includes('npm run qa:browser:retry'), 'CI does not retry only the last failed browser cases');
}

console.log('PASS v1.5.86 browser failed-only retry and fixture contract preflight');
