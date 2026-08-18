#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const helpers = require('./browser/helpers/foxbear-e2e-helpers');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const helperSource = fs.readFileSync('qa/browser/helpers/foxbear-e2e-helpers.js', 'utf8');
const deliverySource = fs.readFileSync('tools/create-delivery-zips.js', 'utf8');
const hygieneSource = fs.readFileSync('tools/archive-hygiene.js', 'utf8');
const patchVerifierSource = fs.readFileSync('tools/verify-patch-zip.js', 'utf8');
const releaseZipSource = fs.readFileSync('tools/create-release-zip.sh', 'utf8');
const deletePaths = fs.readFileSync('DELETE_PATHS.txt', 'utf8').split(/\r?\n/).map(value => value.trim()).filter(Boolean);

assert.strictEqual(pkg.version, '1.6.106');
assert(pkg.qaChecks.includes('node qa/v1683_browser_gate_ui_mode_fixture_source_hygiene_smoke.js'));
assert.strictEqual(helpers.UI_MODE_SESSION_KEY, 'foxbear-ui-mode-session-v1');
assert.strictEqual(helpers.DEFAULT_E2E_UI_MODE, 'expert');
assert.strictEqual(helpers.resolveE2eUiMode(), 'expert');
assert.strictEqual(helpers.resolveE2eUiMode('expert'), 'expert');
assert.strictEqual(helpers.resolveE2eUiMode('ai'), 'ai');
assert.strictEqual(helpers.resolveE2eUiMode(false), '');
assert.strictEqual(helpers.resolveE2eUiMode('unselected'), '');
assert(helperSource.includes("window.sessionStorage.setItem(uiModeSessionKey, uiMode)"));
assert(helperSource.includes("window.sessionStorage.removeItem(uiModeSessionKey)"));
assert(helperSource.includes("window.__FOXBEAR_E2E_UI_MODE__ = uiMode || 'unselected'"));
assert(deletePaths.includes('PATCH_MANIFEST.json'));
assert(fs.existsSync('APPLY_PATCH_CLEANUP.cmd'));
assert(deliverySource.includes("'APPLY_PATCH_CLEANUP.cmd'"));
assert(deliverySource.includes("'APPLY_PATCH_CLEANUP.sh'"));
assert(hygieneSource.includes("=== 'APPLY_PATCH_CLEANUP.cmd'"));
assert(patchVerifierSource.includes("'APPLY_PATCH_CLEANUP.cmd'"));
assert(releaseZipSource.includes('zip -q "${OUTPUT_FILE}" APPLY_PATCH_CLEANUP.cmd'));

console.log('PASS v1.6.83 browser QA starts in an explicit UI mode and patch delivery carries cross-platform source-hygiene cleanup');
