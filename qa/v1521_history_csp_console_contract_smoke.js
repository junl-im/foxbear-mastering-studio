#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const index = read('index.html');
const preview = read('design-preview.html');
const firebase = JSON.parse(read('firebase.json'));
const pwaSpec = read('qa/browser/pwa-back-wakelock-sw-playwright.spec.js');
const runtimeSpec = read('qa/browser/runtime-health-playwright.spec.js');
const syncTool = read('tools/sync-release-metadata.js');

const metaCsp = html => html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)" \/>/)?.[1] || '';
const firebaseCsp = firebase.hosting?.headers
  ?.flatMap(rule => rule.headers || [])
  ?.find(header => header.key === 'Content-Security-Policy')?.value || '';

assert(!metaCsp(index).includes('frame-ancestors'), 'index meta CSP must not contain ignored frame-ancestors');
assert(!metaCsp(preview).includes('frame-ancestors'), 'design preview meta CSP must not contain ignored frame-ancestors');
assert(firebaseCsp.includes("frame-ancestors 'none'"), 'deploy HTTP CSP must retain frame-ancestors protection');
assert(pwaSpec.includes('for (let step = 0; step < 2'), 'history QA must account for the exit-guard sentinel');
assert(pwaSpec.includes('page.goForward({ timeout: 15000 })'), 'history QA must still perform real forward navigation');
assert(!pwaSpec.includes('.catch(() => null)'), 'history QA must not hide navigation failures');
assert(runtimeSpec.includes('consoleErrors ·'), 'runtime console failures must remain actionable');
assert(syncTool.includes('canonicalizeRuntimeMetadata'), 'release sync must repair mixed stale runtime metadata');
assert(syncTool.includes('data-build='), 'release sync must canonicalize stale HTML build labels');

console.log('PASS v1.5.21 history sentinel and CSP console contract');
