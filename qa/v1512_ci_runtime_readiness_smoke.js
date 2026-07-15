'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

(async () => {
  const helperSource = read('qa/browser/helpers/foxbear-e2e-helpers.js');
  const pwaSpec = read('qa/browser/pwa-back-wakelock-sw-playwright.spec.js');
  const runtimeSpec = read('qa/browser/runtime-health-playwright.spec.js');
  const config = read('playwright.config.js');
  const runner = read('qa/browser/run-browser-e2e.js');
  const pagesWorkflow = read('.github/workflows/pages.yml');
  const fallbackWorkflow = read('.github/workflows/pages-branch-fallback.yml');

  assert(helperSource.includes('report.appReady || report.bootFailed'), 'Runtime Health helper must wait for app-owned readiness');
  assert(!helperSource.includes("Boolean(window.FoxBearRuntimeHealth && window.FoxBearRuntimeHealth.getReport)"), 'helper must not stop at Runtime Health object creation');
  assert(helperSource.includes('Last Runtime Health report'), 'readiness timeout must include the latest report');
  assert(helperSource.includes('async function waitForServiceWorkerReady'), 'service worker readiness helper missing');
  assert(helperSource.includes('Promise.race([') && helperSource.includes('readyTimeout'), 'service worker ready wait must be bounded');
  assert(helperSource.includes('const createSentinel = type =>'), 'Wake Lock mock must create a fresh sentinel per request');
  assert(pwaSpec.includes('waitForServiceWorkerReady(page)'), 'PWA test must wait for an active service worker');
  assert(runtimeSpec.includes('genericNetworkNoise'), 'runtime console check must filter browser-only network noise');
  const configProbe = spawnSync(process.execPath, ['-e', "process.env.CI='true'; const config=require('./playwright.config.js'); process.stdout.write(String(config.workers));"], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(configProbe.status, 0, `Playwright config probe failed: ${configProbe.stderr || configProbe.stdout}`);
  const ciWorkers = Number(configProbe.stdout.trim());
  assert(Number.isInteger(ciWorkers) && ciWorkers >= 1 && ciWorkers <= 2, `CI browser workers must be bounded to 1-2, received: ${configProbe.stdout.trim() || 'empty'}`);
  assert(runner.includes('process.argv.slice(2)') && runner.includes('...forwardedArgs'), 'browser runner must forward Playwright CLI arguments');

  for (const [name, workflow] of [['pages', pagesWorkflow], ['fallback', fallbackWorkflow]]) {
    assert(workflow.includes('actions/checkout@v6'), `${name} workflow must use Node 24 checkout action`);
    assert(workflow.includes('actions/setup-node@v6'), `${name} workflow must use Node 24 setup-node action`);
    assert(workflow.includes('actions/upload-artifact@v6'), `${name} workflow must use Node 24 artifact action`);
    assert(!/actions\/(?:checkout|setup-node|upload-artifact)@v4/.test(workflow), `${name} workflow still references Node 20 v4 actions`);
  }

  const { waitForRuntimeHealth } = require('./browser/helpers/foxbear-e2e-helpers');
  let waitedPredicate = '';
  const report = {
    appReady: true,
    bootFailed: false,
    bootStalled: false,
    missingGlobals: [],
    missingDomIds: [],
    assetVersionMismatches: [],
    resourceFailures: [],
    runtimeErrors: []
  };
  const fakePage = {
    async waitForFunction(predicate) {
      waitedPredicate = String(predicate);
    },
    async evaluate() {
      return report;
    }
  };
  const result = await waitForRuntimeHealth(fakePage, { timeout: 4321 });
  assert.strictEqual(result, report);
  assert(waitedPredicate.includes('appReady') && waitedPredicate.includes('bootFailed'), 'runtime wait predicate must use terminal app states');

  console.log('PASS v1.5.12 CI Runtime Health readiness and Actions Node 24 migration');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
