'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

class FakeAudioContext {
  constructor(options = {}) {
    this.options = options;
    this.state = 'suspended';
    this.listeners = new Map();
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  emit(type) {
    for (const listener of this.listeners.get(type) || []) listener({ type });
  }
  async resume() {
    this.state = 'running';
    this.emit('statechange');
  }
  async close() {
    this.state = 'closed';
    this.emit('statechange');
  }
}

(async () => {
  const pageHideListeners = [];
  const window = {
    AudioContext: FakeAudioContext,
    addEventListener(type, listener) {
      if (type === 'pagehide') pageHideListeners.push(listener);
    }
  };
  vm.runInNewContext(read('src/audio/audio-context-manager.js'), { window, console, Date, Map, Set, WeakMap, Object, Promise });
  const manager = window.FoxBearAudioContextManager;
  assert(manager, 'AudioContext manager must be exposed');

  const context = manager.create({ purpose: 'qa-preview', ownerId: 'qa-owner', latencyHint: 'interactive' });
  let diagnostics = manager.getDiagnostics();
  assert.strictEqual(diagnostics.activeCount, 1);
  assert.strictEqual(diagnostics.byPurpose['qa-preview'], 1);
  assert.strictEqual(diagnostics.contexts[0].state, 'suspended');

  await manager.resume(context, 'qa-resume');
  diagnostics = manager.getDiagnostics();
  assert.strictEqual(diagnostics.runningCount, 1);
  assert.strictEqual(diagnostics.contexts[0].resumeCount, 1);

  await manager.closeOwner('qa-owner', 'qa-complete');
  diagnostics = manager.getDiagnostics();
  assert.strictEqual(diagnostics.activeCount, 0);
  assert(pageHideListeners.length === 1, 'pagehide cleanup must be registered once');

  const index = read('index.html');
  const sw = read('sw.js');
  const runtime = read('src/boot/runtime-health.js');
  const app = read('src/app.js');
  const decode = read('src/audio/audio-decode-service.js');
  const performance = read('src/boot/performance-diagnostics.js');
  const helper = read('qa/browser/helpers/foxbear-e2e-helpers.js');
  const browserFiles = [
    'qa/browser/runtime-health-playwright.spec.js',
    'qa/browser/pwa-back-wakelock-sw-playwright.spec.js',
    'qa/browser/bulk-35-import-master-export-playwright.spec.js'
  ].map(read).join('\n');
  const workflow = read('.github/workflows/pages.yml');

  const managerIndex = index.indexOf('src/audio/audio-context-manager.js');
  const decodeIndex = index.indexOf('src/audio/audio-decode-service.js');
  const appIndex = index.indexOf('src/app.js');
  assert(managerIndex > 0 && managerIndex < decodeIndex && managerIndex < appIndex, 'manager must load before Web Audio consumers');
  assert(sw.includes('src/audio/audio-context-manager.js'), 'service worker must precache the manager');
  assert(runtime.includes('FoxBearAudioContextManager.getDiagnostics'), 'runtime health must require manager diagnostics');
  assert(app.includes('FoxBearAudioContexts.create'), 'app preview contexts must use the manager');
  assert(decode.includes('createManagedDecodeContext'), 'decode contexts must use the manager');
  assert(performance.includes('audioContexts'), 'performance diagnostics must report AudioContext lifecycle');

  assert(helper.includes('async function navigateToApp'), 'browser QA must centralize navigation');
  assert(helper.includes("waitUntil: 'domcontentloaded'"), 'browser QA must use DOM readiness instead of network idleness');
  assert(!browserFiles.includes('networkidle'), 'networkidle must not gate Firebase/PWA browser tests');
  assert(/Upload browser QA diagnostics/.test(workflow), 'CI must upload traces after a browser failure');

  const { navigateToApp } = require('./browser/helpers/foxbear-e2e-helpers');
  const navigationCalls = [];
  const fakePage = {
    async goto(url, options) {
      navigationCalls.push({ url, options });
      return { ok: () => true, status: () => 200, statusText: () => 'OK' };
    },
    async waitForFunction(fn, arg, options) { navigationCalls.push({ wait: true, source: String(fn), arg, options }); }
  };
  await navigateToApp(fakePage, { url: 'http://127.0.0.1:4173/', timeout: 12345 });
  assert.strictEqual(navigationCalls[0].options.waitUntil, 'domcontentloaded');
  assert.strictEqual(navigationCalls[0].options.timeout, 12345);
  assert.strictEqual(navigationCalls.length, 3);
  assert.strictEqual(navigationCalls[2].arg, 'expert', 'navigation helper must verify the requested E2E UI mode after DOM readiness');

  console.log('PASS v1.5.11 AudioContext lifecycle and CI navigation stability');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
