#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const retryReport = require('./browser/retry-recovery-report');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const serviceSource = fs.readFileSync('src/ui/ui-mode-service.js', 'utf8');
const helperSource = fs.readFileSync('qa/browser/helpers/foxbear-e2e-helpers.js', 'utf8');
const headerCss = fs.readFileSync('assets/css/header-command-bar.css', 'utf8');
const runtimeSpec = fs.readFileSync('qa/browser/runtime-health-playwright.spec.js', 'utf8');
const retrySource = fs.readFileSync('qa/browser/retry-recovery-report.js', 'utf8');
const deletePaths = fs.readFileSync('DELETE_PATHS.txt', 'utf8').split(/\r?\n/).map(value => value.trim()).filter(Boolean);

assert.strictEqual(pkg.version, '1.6.88');
assert(pkg.qaChecks.includes('node qa/v1685_browser_sentinel_ui_mode_header_recovery_smoke.js'));
assert(serviceSource.includes('function safeReadE2eMode()'));
assert(serviceSource.includes("global.__FOXBEAR_E2E__ !== true"));
assert(serviceSource.includes('safeReadSession(storage) || safeReadE2eMode()'));
assert(helperSource.includes("document.documentElement?.getAttribute?.('data-ui-mode-pref')"));
assert(helperSource.includes('bodyMode === expectedMode'));
assert(/@media \(max-width: 430px\)[\s\S]*?\.brand-command-studio \{[\s\S]*?display: none !important;/.test(headerCss), 'compact command header must retire the redundant studio token before it clips');
assert(runtimeSpec.includes("expect(headerSettings.topLineHeight).toBeLessThanOrEqual(42)"));
assert(runtimeSpec.includes("expect(headerSettings.studioDisplay).toBe('none')"));
assert(runtimeSpec.includes('modeSwitchLeft'));
assert(runtimeSpec.includes('modeSwitchRight'));
assert(retrySource.includes('function printRepeatedCaseAnnotations'));
assert(deletePaths.includes('PATCH_MANIFEST.json'));

class FakeClassList {
  constructor() { this.items = new Set(); }
  add(...items) { items.forEach(item => this.items.add(item)); }
  remove(...items) { items.forEach(item => this.items.delete(item)); }
}
class FakeElement {
  constructor(id, documentRef) {
    this.id = id;
    this.ownerDocument = documentRef;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.hidden = false;
    this.inert = false;
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = '';
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  hasAttribute(name) { return this.attributes.has(name); }
  focus() { this.ownerDocument.activeElement = this; }
  contains(node) { return node === this; }
  querySelectorAll() { return []; }
}
function makeDocument() {
  const documentRef = {
    elements: new Map(),
    activeElement: null,
    documentElement: { attributes: new Map(), setAttribute(name, value) { this.attributes.set(name, String(value)); } },
    getElementById(id) { return this.elements.get(id) || null; },
    querySelector() { return null; }
  };
  documentRef.body = new FakeElement('body', documentRef);
  ['uiModeChooser', 'uiModeChooserPanel', 'uiModeChooserClose', 'uiModeAiBtn', 'uiModeExpertBtn', 'uiModeSwitchBtn', 'uiModeSwitchLabel', 'fileDrop']
    .forEach(id => documentRef.elements.set(id, new FakeElement(id, documentRef)));
  return documentRef;
}

const throwingStorage = {
  getItem() { throw new Error('storage unavailable'); },
  setItem() { throw new Error('storage unavailable'); }
};
const documentRef = makeDocument();
const fakeWindow = {
  document: documentRef,
  sessionStorage: throwingStorage,
  __FOXBEAR_E2E__: true,
  __FOXBEAR_E2E_UI_MODE__: 'expert',
  requestAnimationFrame: callback => { callback(); return 1; },
  setTimeout: callback => { callback(); return 1; },
  addEventListener() {}
};
vm.runInNewContext(serviceSource, { window: fakeWindow, console, Object, String, Boolean, Array, Map, Set });
const controller = fakeWindow.FoxBearUiModeService.createController({ document: documentRef, sessionStorage: throwingStorage });
const snapshot = controller.init();
assert.strictEqual(snapshot.mode, 'expert', 'E2E expert mode must survive unavailable sessionStorage');
assert.strictEqual(snapshot.chooserOpen, false, 'required first-entry chooser must not intercept established E2E mode');
assert.strictEqual(snapshot.chooserRequired, false);
assert.strictEqual(documentRef.body.dataset.uiMode, 'expert');
assert.strictEqual(documentRef.documentElement.attributes.get('data-ui-mode-pref'), 'expert');

const annotations = [];
const originalLog = console.log;
try {
  console.log = value => annotations.push(String(value));
  retryReport.printRepeatedCaseAnnotations({ repeated: [{
    file: 'qa/browser/runtime-health-playwright.spec.js',
    title: 'FoxBear browser runtime health › boots › chromium-mobile-pwa',
    projectName: 'chromium-mobile-pwa',
    retryError: 'expected 40 to be less than or equal to 38'
  }] });
} finally {
  console.log = originalLog;
}
assert.strictEqual(annotations.length, 1);
assert(annotations[0].startsWith('::error title=Browser repeated%3A chromium-mobile-pwa'));
assert(annotations[0].includes('runtime-health-playwright.spec.js'));
assert(annotations[0].includes('expected 40 to be less than or equal to 38'));

console.log('PASS v1.6.85 browser sentinel UI-mode fallback, compact header recovery, and exact retry annotations');
