#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  classifyPlaywrightFailure,
  groupPlaywrightFailures
} = require('./browser/run-browser-e2e');
const {
  assertBrowserSpecSafety,
  scanBrowserSpecSafety
} = require('./browser/spec-preflight');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const bulkSpec = read('qa/browser/v1573-bulk-mastering-controls-visual.spec.js');
const downloadSpec = read('qa/browser/v1574-mobile-download-batch-controls-visual.spec.js');
const builders = read('qa/browser/helpers/visual-fixture-builders.js');
const runner = read('qa/browser/run-browser-e2e.js');

assert(bulkSpec.includes("require('./helpers/visual-fixture-builders')"), 'bulk visual spec does not use the shared fixture builder');
assert(downloadSpec.includes("require('./helpers/visual-fixture-builders')"), 'download visual spec does not use the shared fixture builder');
assert(bulkSpec.includes('page.evaluate(stageBulkMasteringHudFixture'), 'bulk visual fixture is not serialized through the shared builder');
assert(downloadSpec.includes('page.evaluate(stageDownloadOptionsFixture'), 'download visual fixture is not serialized through the shared builder');
assert(builders.includes("meter.setAttribute('aria-valuenow'"), 'bulk fixture builder does not expose progress semantics');
assert(builders.includes("button.setAttribute('aria-pressed'"), 'download fixture builder does not expose selected-family semantics');
assert(runner.indexOf('assertBrowserSpecSafety();') < runner.indexOf('resolvePlaywrightCli();'), 'browser preflight must run before Playwright dependency/bootstrap work');

assert.doesNotThrow(() => assertBrowserSpecSafety(), 'current browser QA tree fails the dependency-light safety preflight');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-browser-preflight-'));
const unsafeFile = path.join(tempDir, 'unsafe.spec.js');
fs.writeFileSync(unsafeFile, "document.querySelector('#x').innerHTML = '<b>unsafe</b>';\n", 'utf8');
const violations = scanBrowserSpecSafety({ files: [unsafeFile] });
assert.strictEqual(violations.length, 1, 'preflight did not report the injected unsafe sink');
assert.strictEqual(violations[0].code, 'HTML_INNER_ASSIGNMENT', 'preflight reported the wrong unsafe-sink code');
fs.rmSync(tempDir, { recursive: true, force: true });

const trustedMessage = "page.evaluate: TypeError: Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment.";
const failures = Array.from({ length: 10 }, (_, index) => ({
  title: `visual case ${index + 1} › chromium-${index % 2 ? 'mobile-pwa' : 'desktop'}`,
  message: trustedMessage
}));
const classification = classifyPlaywrightFailure(failures[0]);
assert.strictEqual(classification.code, 'TRUSTED_TYPES_FIXTURE', 'Trusted Types failure classification mismatch');
const groups = groupPlaywrightFailures(failures);
assert.strictEqual(groups.length, 1, 'duplicate Trusted Types failures were not collapsed to one root cause');
assert.strictEqual(groups[0].count, 10, 'root-cause group lost duplicate failure count');
assert(groups[0].action.includes('spec-preflight.js'), 'root-cause group lacks the actionable preflight command');

console.log('PASS v1.5.85 browser fixture preflight and grouped failure diagnostics');
