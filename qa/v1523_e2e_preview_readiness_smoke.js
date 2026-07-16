#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const helper = read('qa/browser/helpers/foxbear-e2e-helpers.js');
const app = read('src/app.js');
const spec = read('qa/browser/preview-translation-playback-playwright.spec.js');

assert(helper.includes('const disableAutoDialogs = options.disableAutoDialogs === true'), 'navigation helper must expose targeted auto-dialog isolation');
assert(helper.includes('window.__FOXBEAR_E2E_DISABLE_AUTO_DIALOGS__ = disableAutoDialogs'), 'targeted E2E dialog flag must be installed before navigation');
assert(app.includes('window.__FOXBEAR_E2E_DISABLE_AUTO_DIALOGS__ === true'), 'single-track recommendation dialog must honor the targeted E2E isolation flag');
assert(spec.includes("navigateToApp(page, { disableAutoDialogs: true })"), 'preview routing spec must isolate unrelated recommendation dialogs');
assert(spec.includes("expect(playButton).toBeEnabled") && spec.includes('blocking dialogs before playback'), 'preview routing spec must verify actionable playback readiness');
assert(spec.includes('document.elementFromPoint') && spec.includes('clickTargetOwned'), 'preview routing failure diagnostics must identify click interception');
assert(!app.includes('if (window.__FOXBEAR_E2E__) return;'), 'all E2E runs must not globally suppress recommendation dialogs');

(async () => {
  const { navigateToApp } = require('./browser/helpers/foxbear-e2e-helpers');
  const calls = [];
  const fakeWindow = {};
  const fakePage = {
    async route() {},
    async addInitScript(fn, arg) { fn.call(null, arg); calls.push({ init: { ...fakeWindow, arg } }); },
    async goto(url, options) { calls.push({ url, options }); return { ok: () => true, status: () => 200, statusText: () => 'OK' }; },
    async waitForFunction() { calls.push({ ready: true }); }
  };
  const previousWindow = global.window;
  global.window = fakeWindow;
  try {
    await navigateToApp(fakePage, { url: 'http://127.0.0.1:4173/', disableAutoDialogs: true });
    assert.strictEqual(fakeWindow.__FOXBEAR_E2E_DISABLE_AUTO_DIALOGS__, true);
    assert.strictEqual(fakeWindow.__FOXBEAR_E2E__, true);
  } finally {
    global.window = previousWindow;
  }
  console.log('PASS v1.5.23 deterministic preview playback readiness');
})().catch(error => { console.error(error); process.exitCode = 1; });
