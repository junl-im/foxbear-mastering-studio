#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { collectPlaywrightFailures, summarizeStaticServerOutput } = require('./browser/run-browser-e2e');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const fakeReport = {
  suites: [{
    title: 'suite',
    specs: [{
      title: 'case',
      tests: [{
        projectName: 'chromium-desktop',
        status: 'unexpected',
        results: [{ status: 'failed', errors: [{ message: 'Expected true but received false\nstack line' }] }]
      }]
    }]
  }]
};
const failures = collectPlaywrightFailures(fakeReport);
assert.strictEqual(failures.length, 1, 'Playwright JSON failure summary did not find the failed test');
assert(failures[0].title.includes('chromium-desktop') && failures[0].message.includes('Expected true'), 'Playwright failure summary lost the useful assertion');

const serverSummary = summarizeStaticServerOutput([
  '127.0.0.1 - - [date] "GET / HTTP/1.1" 200 -',
  '127.0.0.1 - - [date] "GET /missing.js HTTP/1.1" 404 -'
].join('\n'));
assert.strictEqual(serverSummary.requestCount, 2, 'server diagnostics request count mismatch');
assert.strictEqual(serverSummary.failedRequests.length, 1, 'server diagnostics did not preserve HTTP failures');
assert(serverSummary.statusText.includes('200:1') && serverSummary.statusText.includes('404:1'), 'server diagnostics status summary mismatch');

const playwrightConfig = read('playwright.config.js');
assert(playwrightConfig.includes("['json', { outputFile: 'qa/browser-results/results.json' }]") , 'Playwright JSON reporter is missing');

const runner = read('qa/browser/run-browser-e2e.js');
assert(runner.includes('printPlaywrightFailureSummary();'), 'browser runner does not print a concise final failure summary');
assert(runner.includes("static-server.log"), 'browser runner does not persist the full static server log');
assert(!runner.includes('FoxBear static server diagnostics (tail)'), 'browser runner still floods the Actions log with the full server tail');

const helper = read('qa/browser/helpers/foxbear-e2e-helpers.js');
assert(helper.includes('readyTimeout: timeout'), 'service worker readiness still uses a shorter nested timeout');
assert(helper.includes('did not reach the active ready state'), 'service worker readiness failure lacks an explicit active-state diagnosis');

const sw = read('sw.js');
assert(sw.includes('const INSTALL_ASSETS = [') && sw.includes('...CORE_ASSETS') && sw.includes('const WARM_ASSETS = CORE_ASSETS.filter'), 'service worker atomic install and optional refresh phases are incomplete');
assert(sw.includes('cache.addAll(REQUIRED_INSTALL_ASSETS)') && sw.includes('cacheInstallAssetsBestEffort(cache, OPTIONAL_INSTALL_ASSETS)') && !sw.includes('cache.addAll(INSTALL_ASSETS)') && !sw.includes('cache.addAll(CORE_ASSETS)'), 'service worker install must hard-fail only on the minimum recovery shell and cache the remaining boot graph best-effort');
assert(sw.includes("event.data.type === 'FOXBEAR_WARM_CACHE'") && sw.includes('warmFoxBearCoreCache()'), 'service worker warm-cache message contract is missing');

const app = read('src/app.js');
const pwaRuntimeBridge = read('src/boot/pwa-runtime-bridge.js');
assert(app.includes('FoxBearPwaRuntimeBridge') && pwaRuntimeBridge.includes('navigatorRef.serviceWorker.ready.catch(() => null)') && pwaRuntimeBridge.includes("activeWorker.postMessage({ type: 'FOXBEAR_WARM_CACHE' })"), 'app does not wait for active service worker and request background cache warming');

const releasePack = read('tools/create-release-zip.sh');
const overwritePack = read('tools/create-overwrite-zip.sh');
const releaseVerify = read('tools/verify-release-zip.js');
const overwriteVerify = read('tools/verify-overwrite-zip.js');
assert(releasePack.includes("-x '*.log'") && releasePack.includes("-x '.last-run.json'"), 'release ZIP does not exclude transient logs');
assert(overwritePack.includes("-type f -name '*.log' -delete") && overwritePack.includes('qa/browser-results'), 'overwrite ZIP does not clean transient browser artifacts');
assert(releaseVerify.includes('assertNoTransientArtifacts(tempDir)') && overwriteVerify.includes('assertNoTransientArtifacts(tempDir)'), 'ZIP verifiers do not reject transient artifacts');

console.log('PASS v1.5.18 CI diagnostics, service worker readiness, and clean package smoke');
