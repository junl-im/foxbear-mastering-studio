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

const runtimeSpecPath = 'qa/browser/runtime-health-playwright.spec.js';
const helperPath = 'qa/browser/helpers/foxbear-e2e-helpers.js';
const runnerPath = 'qa/browser/run-browser-e2e.js';
const configPath = 'playwright.config.js';

assert(fs.existsSync(runtimeSpecPath), 'Playwright runtime-health spec missing');
assert(fs.existsSync(helperPath), 'Playwright helper module missing');
assert(fs.existsSync(runnerPath), 'Playwright runner missing');
assert(fs.existsSync(configPath), 'Playwright config missing');
assert(pkg.scripts && pkg.scripts['qa:browser'], 'qa:browser script missing');
assert(pkg.scripts['qa:browser'].includes('run-browser-e2e.js'), 'qa:browser should run local static server wrapper');
assert(pkg.scripts['qa:browser:external'], 'qa:browser:external script missing');
assert(pkg.scripts['qa:browser:deep'], 'qa:browser:deep script missing');

const runtimeSpec = fs.readFileSync(runtimeSpecPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');
const runner = fs.readFileSync(runnerPath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8');

assert(runtimeSpec.includes('FoxBearRuntimeHealth.getReport') || runtimeSpec.includes('expectRuntimeHealthy'), 'runtime spec does not inspect runtime health report');
assert(runtimeSpec.includes('resourceFailures') || runtimeSpec.includes('expectRuntimeHealthy'), 'runtime spec does not check resource failures');
assert(runtimeSpec.includes('missingGlobals') || runtimeSpec.includes('expectRuntimeHealthy'), 'runtime spec does not check missing globals');
assert(helper.includes('FOXBEAR_E2E_URL'), 'helper does not support external E2E URL override');
assert(helper.includes('createSyntheticWavFiles'), 'helper does not create synthetic audio files');
assert(helper.includes('installWakeLockMock'), 'helper does not provide wake lock mock');
assert(runner.includes('startStaticServer') && helper.includes('python3') && helper.includes('http.server'), 'runner/helper should start local static HTTP server');
assert(config.includes('chromium-desktop') && config.includes('chromium-mobile-pwa'), 'Playwright config should include desktop and mobile Chromium projects');

console.log('PASS v1.5.1 browser QA scaffold smoke');
