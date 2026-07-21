#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { getReleaseMetadata, renderBuildInfo } = require('../tools/release-metadata');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL v1.5.7 release foundation smoke: ${message}`);
    process.exit(1);
  }
}

const meta = getReleaseMetadata();
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const manifest = JSON.parse(read('manifest.webmanifest'));
const index = read('index.html');
const app = read('src/app.js');
const runtimeConfig = read('src/config/app-runtime-config.js');
const buildInfo = read('src/config/build-info.js');
const sw = read('sw.js');
const changelog = read('CHANGELOG.md');
const status = read('STATUS.md');
const versioning = read('VERSIONING.md');
const checklist = read('RELEASE_CHECKLIST.md');
const adr = read('docs/decisions/0001-dock-fft-removal.md');
const runner = read('qa/browser/run-browser-e2e.js');
const pages = read('.github/workflows/pages.yml');
const fallback = read('.github/workflows/pages-branch-fallback.yml');
const overwrite = read('tools/create-overwrite-zip.sh');
const syncTool = read('tools/sync-release-metadata.js');

assert(meta.productVersion === pkg.version, 'release metadata should match package version');
assert(meta.assetVersion.startsWith(`${meta.productVersion}-`), 'asset version should start with product version');
assert(pkg.devDependencies?.['@playwright/test'] === '1.61.1', '@playwright/test should be pinned exactly');
assert(lock.version === pkg.version && lock.packages?.['']?.version === pkg.version, 'package lock root version mismatch');
assert(lock.packages?.['']?.devDependencies?.['@playwright/test'] === '1.61.1', 'package lock missing pinned Playwright dependency');
assert(manifest.version === pkg.version, 'manifest version mismatch');
assert(buildInfo === renderBuildInfo(meta), 'generated build-info does not match package metadata');
assert(index.indexOf('src/config/build-info.js') < index.indexOf('src/boot/runtime-health.js'), 'build-info must load before runtime health');
assert(index.includes(`data-build="${meta.productVersion}"`) && index.includes(`?v=${meta.assetVersion}`), 'index release metadata mismatch');
assert(runtimeConfig.includes('global.FoxBearBuildInfo') && app.includes('release metadata mismatch') && app.includes('FoxBearBuildInfo.appVersion'), 'runtime does not consume generated build metadata');
assert(sw.includes(`const CACHE_NAME = '${meta.cacheName}'`) && sw.includes('foxbear-shell-v1.5.6-export-progress-recovery'), 'service worker current/legacy cache metadata incomplete');
assert(changelog.startsWith(`# v${meta.productVersion} -`), 'CHANGELOG latest release missing');
assert((changelog.match(/^# Changelog$/gm) || []).length === 0, 'duplicate generic Changelog heading remains');
assert(!changelog.includes('## v1.5.57 carry-forward anchors') && !changelog.includes('## v1.5.57 Carry-forward Documentation Anchors'), 'carry-forward anchor sections should not return');
assert(status.includes('Dock mini FFT remains removed') && status.includes('npm run check:release'), 'STATUS invariants incomplete');
assert(versioning.includes('package.json') && versioning.includes('source of truth') && versioning.includes('Asset version'), 'VERSIONING semantics incomplete');
assert(checklist.includes('npm ci') && checklist.includes('npm run check:release') && checklist.includes('npm run qa:browser:deep'), 'release checklist incomplete');
assert(adr.includes('Keep FFT Out of the Dock Player') && adr.includes('#bottomPreviewSpectrum') && adr.includes('renderMini'), 'Dock FFT ADR incomplete');
assert(runner.includes("require.resolve('@playwright/test/cli')") && !runner.includes("spawnSync('npx'"), 'browser runner must use pinned local Playwright CLI');
const releaseGateTool = pkg.scripts['check:release'].includes('tools/run-release-gate.js')
  ? read('tools/run-release-gate.js')
  : pkg.scripts['check:release'];
assert(
  releaseGateTool.includes('version:check') && releaseGateTool.includes('handoff:check') &&
  releaseGateTool.includes('check:static') && releaseGateTool.includes('qa:browser'),
  'release gate script mismatch'
);
assert(pkg.scripts['version:sync'] && pkg.scripts['version:check'], 'version sync/check scripts missing');
assert(syncTool.includes('protectedLabels') && syncTool.includes('Historical QA names'), 'version sync should preserve historical QA labels');
for (const workflow of [pages, fallback]) {
  assert(workflow.includes('actions/checkout@v6'), 'workflow missing Node 24 checkout action');
  assert(workflow.includes('actions/setup-node@v6'), 'workflow missing Node 24 setup action');
  assert(workflow.includes('actions/upload-artifact@v6'), 'workflow missing Node 24 artifact action');
  assert(workflow.includes('npm ci'), 'workflow missing reproducible dependency install');
  assert(workflow.includes('playwright install --with-deps chromium'), 'workflow missing Chromium dependency install');
  assert(workflow.includes('npm run check:release'), 'workflow missing release gate');
}
for (const file of ['STATUS.md', 'VERSIONING.md', 'RELEASE_CHECKLIST.md', 'package-lock.json']) {
  assert(overwrite.includes(`copy_path "${file}"`), `overwrite package missing ${file}`);
}
assert((pkg.qaChecks || []).includes('node qa/v157_release_foundation_smoke.js'), 'v1.5.57 smoke missing from qaChecks');

console.log('PASS v1.5.7 release foundation smoke');
