#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const perf = read('src/boot/performance-diagnostics.js');
const app = read('src/app.js');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.73');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');
assert(perf.includes('function migrateLegacyAutoOpenPreference()'), 'legacy persisted auto-open migration is required');
assert(perf.includes("if (readStorage() !== 'on') return false;"), 'legacy on preference must be detected');
assert(perf.includes('writeStorage(false);'), 'legacy auto-open preference must be cleared');
assert(!perf.includes("return readStorage() === 'on';"), 'stored diagnostics state must not auto-open the panel');
assert(perf.includes('const AUTO_CLOSE_STABLE_SAMPLES = 2'), 'automatic panel must require consecutive stable samples');
assert(perf.includes('const AUTO_CLOSE_MIN_UPTIME_MS = 3500'), 'automatic panel must allow boot stabilization time');
assert(perf.includes('snapshot.runtime?.ok === true && snapshot.runtime?.appReady === true'), 'auto-close must wait for healthy runtime readiness');
assert(perf.includes("setPanelVisible(false, { restoreFocus: false, reason: 'auto-stable' })"), 'stable automatic panel must close itself');
assert(perf.includes("state.openSource = 'user-interaction'"), 'user interaction must convert an automatic panel into a manual panel');
assert(perf.includes('setEnabled(true, { persist: false, silent: true })'), 'opening the panel must not persist future auto-open');
assert(app.includes("source: 'settings'"), 'settings-opened diagnostics must be marked manual');
assert(handoff.startsWith('# Handoff - v1.6.73'), 'handoff must lead with current release');

function createSandbox({ href = 'https://foxbear.test/', stored = 'off', readyState = 'complete' } = {}) {
  const writes = [];
  const listeners = new Map();
  const body = {
    classList: { toggle() {} },
    contains: () => true,
    appendChild() { throw new Error('normal startup must not construct diagnostics UI'); }
  };
  const document = {
    readyState,
    body,
    visibilityState: 'visible',
    activeElement: body,
    addEventListener(type, handler) { listeners.set(type, handler); },
    querySelectorAll: () => [],
    getElementsByTagName: () => []
  };
  const sandbox = {
    console,
    URL,
    Date,
    Math,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Map,
    Set,
    Error,
    JSON,
    location: { href },
    document,
    performance: { now: () => 0 },
    navigator: {},
    localStorage: {
      getItem: key => key === 'foxbear-perf-diagnostics' ? stored : null,
      setItem: (key, value) => writes.push([key, value])
    },
    setTimeout: () => 1,
    clearTimeout() {},
    addEventListener() {},
    dispatchEvent() {},
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(perf, sandbox, { filename: 'performance-diagnostics.js' });
  return { sandbox, writes, listeners };
}

const normal = createSandbox({ stored: 'on' });
const normalState = normal.sandbox.FoxBearPerformanceDiagnostics.getLifecycleState();
assert.strictEqual(normalState.enabled, false, 'legacy preference must not enable diagnostics at normal startup');
assert.strictEqual(normalState.panelVisible, false, 'normal startup must keep the panel hidden');
assert.strictEqual(normalState.legacyAutoOpenMigrated, true, 'legacy preference migration must be observable');
assert.deepStrictEqual(normal.writes, [['foxbear-perf-diagnostics', 'off']], 'legacy on preference must be cleared once');

const explicit = createSandbox({ href: 'https://foxbear.test/?perf=1', stored: 'off', readyState: 'loading' });
const explicitState = explicit.sandbox.FoxBearPerformanceDiagnostics.getLifecycleState();
assert.strictEqual(explicitState.enabled, true, 'explicit perf query must enable diagnostics collection');
assert.strictEqual(explicitState.panelVisible, false, 'panel waits for DOMContentLoaded before construction');
assert.strictEqual(typeof explicit.listeners.get('DOMContentLoaded'), 'function', 'explicit query must schedule automatic opening');

console.log('PASS v1.6.1 transient performance diagnostics startup and stable auto-dismiss');
