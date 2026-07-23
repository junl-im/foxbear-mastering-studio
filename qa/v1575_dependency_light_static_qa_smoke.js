#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const runnerSource = read('qa/browser/run-browser-e2e.js');
const syncSource = read('tools/sync-release-metadata.js');
assert(!runnerSource.includes("const playwrightCli = require.resolve('@playwright/test/cli')"),
  'browser runner must not resolve Playwright at module load time');
assert(runnerSource.includes('function resolvePlaywrightCli('),
  'browser runner must expose a lazy Playwright dependency resolver');
assert(runnerSource.includes('FOXBEAR_PLAYWRIGHT_DEPENDENCY_MISSING'),
  'missing Playwright dependency must have a stable diagnostic code');
assert(syncSource.includes("read('functions/package.json')")
  && syncSource.includes("read('functions/package-lock.json')")
  && syncSource.includes("path.join(ROOT, 'functions/index.js')"),
  'release metadata sync must include the Functions package and runtime version');
assert(syncSource.includes("read('qa/QA_REPORT.md')"),
  'release metadata validation must reject a stale current QA report');

const { resolvePlaywrightCli, hasExplicitTestTarget } = require('./browser/run-browser-e2e');
assert.strictEqual(hasExplicitTestTarget(['qa/browser/runtime-health-playwright.spec.js']), true,
  'browser helper imports must remain usable without Playwright installed');

assert.throws(
  () => resolvePlaywrightCli(() => {
    const error = new Error("Cannot find module '@playwright/test/cli'");
    error.code = 'MODULE_NOT_FOUND';
    throw error;
  }),
  error => error?.code === 'FOXBEAR_PLAYWRIGHT_DEPENDENCY_MISSING'
    && error.message.includes('npm ci')
    && error.message.includes('qa:browser:install'),
  'lazy resolver must return actionable dependency recovery guidance'
);

const configPath = path.join(ROOT, 'playwright.config.js');
const originalLoad = Module._load;
const originalCi = process.env.CI;
try {
  process.env.CI = 'true';
  Module._load = function foxbearMissingPlaywright(request, parent, isMain) {
    if (request === '@playwright/test') {
      const error = new Error("Cannot find module '@playwright/test'");
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);
  assert.strictEqual(config.workers, 2, 'fallback config must preserve bounded CI workers');
  assert.strictEqual(config.projects.length, 2, 'fallback config must preserve desktop and mobile projects');
  assert.strictEqual(config.projects[0].use.browserName, 'chromium', 'desktop fallback must target Chromium');
  assert.strictEqual(config.projects[1].use.isMobile, true, 'mobile fallback must preserve mobile emulation');
} finally {
  Module._load = originalLoad;
  if (originalCi === undefined) delete process.env.CI;
  else process.env.CI = originalCi;
  delete require.cache[require.resolve(configPath)];
}

console.log('PASS v1.5.75 dependency-light static QA and Playwright bootstrap diagnostics');
