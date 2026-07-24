#!/usr/bin/env node
'use strict';

const fs = require('fs');
const pkg = require('../package.json');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const files = {
  runtime: 'qa/browser/runtime-health-playwright.spec.js',
  pwa: 'qa/browser/pwa-back-wakelock-sw-playwright.spec.js',
  bulk: 'qa/browser/bulk-35-import-master-export-playwright.spec.js',
  helper: 'qa/browser/helpers/foxbear-e2e-helpers.js',
  runner: 'qa/browser/run-browser-e2e.js',
  healthRunner: 'qa/browser/run-browser-health-first.js',
  config: 'playwright.config.js',
  readme: 'README.md',
  handoff: 'HANDOFF.md',
  qaReport: 'qa/QA_REPORT.md'
};
Object.entries(files).forEach(([label, file]) => must(fs.existsSync(file), `${label} file missing: ${file}`));

const runtime = fs.readFileSync(files.runtime, 'utf8');
const pwa = fs.readFileSync(files.pwa, 'utf8');
const bulk = fs.readFileSync(files.bulk, 'utf8');
const helper = fs.readFileSync(files.helper, 'utf8');
const runner = fs.readFileSync(files.runner, 'utf8');
const healthRunner = fs.readFileSync(files.healthRunner, 'utf8');
const config = fs.readFileSync(files.config, 'utf8');
const readme = fs.readFileSync(files.readme, 'utf8');
const handoff = fs.readFileSync(files.handoff, 'utf8');
const qaReport = fs.readFileSync(files.qaReport, 'utf8');

must(pkg.scripts['qa:browser'] === 'node qa/browser/run-browser-health-first.js', 'qa:browser should run health-first browser E2E wrapper');
must(pkg.scripts['qa:browser:external'].includes('playwright test qa/browser'), 'qa:browser:external should run Playwright specs against supplied URL');
must(pkg.scripts['qa:browser:deep'].includes('FOXBEAR_E2E_DEEP=1'), 'qa:browser:deep should enable deep 35-track scenario');
must((pkg.qaChecks || []).includes('node qa/v151_real_browser_automation_smoke.js'), 'v151 smoke missing from qaChecks');

must(runtime.includes('expectRuntimeHealthy') && runtime.includes('consoleErrors'), 'runtime health spec should assert health and console errors');
must(pwa.includes('installWakeLockMock') && pwa.includes('FoxBearWakeLockController.request'), 'wake lock browser spec missing mock/controller request');
must(pwa.includes('history.pushState') && pwa.includes('goBack'), 'back navigation browser spec missing');
must(pwa.includes('registration.update') && (pwa.includes('waitForServiceWorkerReady') || pwa.includes('getServiceWorkerSnapshot')), 'service worker update browser spec missing');
must(bulk.includes('createSyntheticWavFiles(35') && bulk.includes('#fileInput'), '35-track import spec missing synthetic upload');
must(bulk.includes('FOXBEAR_E2E_DEEP') && bulk.includes('#masterAllBtn') && bulk.includes('#zipBtn'), 'deep master/export scenario missing');
must(helper.includes('makeTinyWavBuffer') && helper.includes('startStaticServer') && helper.includes('expectRuntimeHealthy'), 'browser helper does not expose required utilities');
must(healthRunner.includes('runtime-health-playwright.spec.js') && healthRunner.includes('run-browser-e2e.js'), 'health-first wrapper should gate heavy specs on Runtime Health');
must(runner.includes('waitForServer') && runner.includes('resolvePlaywrightCli') && runner.includes("'@playwright/test/cli'") && runner.includes('process.execPath'), 'browser runner should wait for static server then invoke the pinned local Playwright CLI lazily');
must(config.includes('Desktop Chrome') && config.includes('Pixel 5'), 'Playwright config should cover desktop and mobile viewport');
must(readme.includes('v1.5.1') && readme.includes('npm run qa:browser'), 'README should document v1.5.1 browser QA');
must(handoff.includes('v1.5.1') && handoff.includes('Playwright'), 'HANDOFF should document v1.5.1 browser QA');
must(/\b(\d+)\/\1 PASS\b/.test(qaReport) && qaReport.includes('v1.5.1'), 'QA report should record a self-consistent PASS target and v1.5.1 coverage');

console.log('PASS v1.5.1 real browser automation smoke');
