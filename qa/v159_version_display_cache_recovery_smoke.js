#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getReleaseMetadata } = require('../tools/release-metadata');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.5.9 version display/cache recovery smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };
const meta = getReleaseMetadata();
const historicalVersion = ['1', '5', '9'].join('.');

const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('manifest.webmanifest'));
const index = read('index.html');
const service = read('src/boot/release-presentation-service.js');
const safety = read('src/boot/update-safety-service.js');
const sw = read('sw.js');
const sync = read('tools/sync-release-metadata.js');
const status = read('STATUS.md');
const changelog = read('CHANGELOG.md');
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');

assert(pkg.version === meta.productVersion, 'package version should match current release metadata');
assert(pkg.qaChecks.includes('node --check src/boot/release-presentation-service.js'), 'release presentation syntax check missing');
assert(pkg.qaChecks.includes('node qa/v159_version_display_cache_recovery_smoke.js'), 'v1.7.4 smoke missing from package QA');
assert(manifest.version === meta.productVersion, 'manifest version mismatch');
assert(manifest.description.includes(`v${meta.productVersion}`) && manifest.description.includes(meta.buildId), 'manifest description must follow release metadata');
assert(index.includes('data-release-label="version-button"') && index.includes('data-release-label="program-eyebrow"'), 'visible version labels must be centrally bound');
assert(index.includes(`src/boot/release-presentation-service.js?v=${meta.assetVersion}`), 'release presentation service asset missing');
assert(service.includes('FoxBearReleasePresentation') && service.includes('repaired stale release labels'), 'release presentation diagnostics missing');
assert(safety.includes('const BUILD_INFO = global.FoxBearBuildInfo || {}') && safety.includes('BUILD_INFO.bootRevision'), 'Update Safety should derive release metadata from build info');
assert(sw.includes("event.data.type === 'FOXBEAR_GET_RELEASE_INFO'"), 'service worker release info message missing');
assert((sw.includes("fetch(request, { cache: 'no-store' })") || sw.includes("fetch(canonicalIndex, { cache: 'no-store'")) && sw.includes('event.preloadResponse'), 'navigation must bypass stale HTTP cache before fallback');
const legacyList = sw.match(/const LEGACY_CACHE_NAMES = \[([^\]]*)\];/)?.[1] || '';
assert(!legacyList.includes(`'${meta.cacheName}'`), 'current cache name must not remain in legacy list');
assert(sync.includes('manifest.description =') && sync.includes("filter(name => name && name !== meta.cacheName)"), 'release sync should maintain description and sanitize legacy caches');

function makeNode(text = '') {
    return {
        textContent: text,
        dataset: {},
        attrs: {},
        getAttribute(name) { return this.attrs[name] || ''; },
        setAttribute(name, value) { this.attrs[name] = String(value); }
    };
}

const versionButton = makeNode('v1.4.26');
const programEyebrow = makeNode('FoxBear Mastering PRO v1.4.26');
const description = makeNode();
description.attrs.content = 'FoxBear AI Mastering Studio Pro v1.4.26';
const body = makeNode();
body.dataset.build = '1.4.26';
const documentElement = makeNode();
const listeners = {};
const document = {
    readyState: 'complete',
    title: 'FoxBear Mastering PRO v1.4.26',
    body,
    documentElement,
    querySelector(selector) { return selector === 'meta[name="description"]' ? description : null; },
    querySelectorAll(selector) {
        if (selector === '[data-release-label="version-button"]') return [versionButton];
        if (selector === '[data-release-label="program-eyebrow"]') return [programEyebrow];
        return [];
    },
    addEventListener(type, handler) { listeners[type] = handler; }
};
const context = {
    console: { warn() {}, log() {}, error() {} },
    document,
    navigator: { serviceWorker: { controller: null } },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    setTimeout,
    clearTimeout,
    addEventListener() {},
    dispatchEvent() {},
    FoxBearBuildInfo: {
        productVersion: meta.productVersion,
        appVersion: meta.appVersion,
        buildId: meta.buildId,
        assetVersion: meta.assetVersion,
        cacheName: meta.cacheName
    }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(service, context, { filename: 'release-presentation-service.js' });
const report = context.FoxBearReleasePresentation.getReport();
assert(report.ok && report.recoveredStaticMismatch, 'runtime service should repair stale static labels');
assert(versionButton.textContent === `v${meta.productVersion}`, 'top build version token not repaired');
assert(programEyebrow.textContent === `FoxBear Mastering PRO v${meta.productVersion}`, 'program info version not repaired');
assert(document.title === `FoxBear Mastering PRO v${meta.productVersion}`, 'document title not repaired');
assert(body.dataset.build === meta.productVersion && body.dataset.assetVersion === meta.assetVersion, 'body release markers not repaired');
assert(description.attrs.content.includes(`v${meta.productVersion}`) && description.attrs.content.includes(meta.buildId), 'runtime description not repaired');

assert(status.includes('FoxBearReleasePresentation') && status.includes('1.7.4-reload-reentry-mode-chooser'), 'STATUS current release/invariant missing');
assert(changelog.includes(`# v${historicalVersion} - Version Display and Cache Recovery`), 'CHANGELOG v1.7.4 history missing');
assert(readme.includes(`v${historicalVersion} Version Display and Cache Recovery`), 'README v1.7.4 history missing');
assert(handoff.includes(`v${historicalVersion} Version Display and Cache Recovery`), 'HANDOFF v1.7.4 history missing');
assert(qaReport.includes('185/185 PASS') && qaReport.includes(`## v${historicalVersion} coverage`), 'QA report missing v1.7.4 result/coverage');
console.log('PASS v1.5.9 version display/cache recovery smoke');
