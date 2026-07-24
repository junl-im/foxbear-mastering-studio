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
const mobileView = read('src/ui/mobile-native-view.js');
const css = read('assets/css/boot/performance-diagnostics.css');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.2');
assert.strictEqual(pkg.foxbearRelease.buildId, 'nonblocking-health-status-design-polish');
assert(perf.includes('const ACTIVITY_GUIDANCE = Object.freeze({'), 'normal activity must be separated from actionable warnings');
assert(perf.includes("activities.push('mastering-active')"), 'mastering activity must stay informational');
assert(perf.includes('const RECENT_LONG_TASK_WINDOW_MS = 60000'), 'old long tasks must expire from active health warnings');
assert(perf.includes('const RECENT_DECODE_ERROR_WINDOW_MS = 120000'), 'decode errors must expire from active health warnings');
assert(perf.includes('const AMBIENT_DANGER_CONFIRM_SAMPLES = 2'), 'danger notice must require consecutive samples');
assert(perf.includes('const AMBIENT_RECOVERY_CONFIRM_SAMPLES = 2'), 'recovery must require consecutive healthy samples');
assert(perf.includes("setPanelVisible(true, { source: 'health-notice'"), 'non-blocking notice must open diagnostics only after explicit user action');
assert(perf.includes("hideHealthNotice('health-recovered')"), 'danger notice must disappear after recovery');
assert(perf.includes('state.recommendations.hidden = warningCount < 1'), 'normal diagnostics must hide empty recommendations');
assert(perf.includes('state.workerSection.hidden = items.length < 1'), 'normal diagnostics must hide empty Worker details');
assert(mobileView.includes('id = \'performanceHealthBadge\''), 'settings trigger must include a compact health badge');
assert(css.includes('.foxbear-health-notice[hidden]'), 'non-blocking notice must have a true hidden state');
assert(css.includes(".performance-health-badge[data-tone='danger']"), 'settings badge must distinguish danger state');
assert(handoff.startsWith('# Handoff - v1.6.2'), 'handoff must lead with current release');

class FakeNode {
  constructor(tag = 'div', id = '') {
    this.tagName = String(tag).toUpperCase();
    this.id = id;
    this.hidden = false;
    this.dataset = {};
    this.children = [];
    this.attributes = new Map();
    this.className = '';
    this.textContent = '';
    this.title = '';
    this.disabled = false;
    this.classList = { toggle() {}, add() {}, remove() {}, contains() { return false; } };
  }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); return node; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  addEventListener(type, handler) { this[`on${type}`] = handler; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  focus() {}
}

const toggle = new FakeNode('button', 'mobileNativeQuickToggle');
const badge = new FakeNode('span', 'performanceHealthBadge');
badge.hidden = true;
toggle.appendChild(badge);
const nodes = new Map([[toggle.id, toggle], [badge.id, badge]]);
const body = new FakeNode('body');
body.contains = () => true;
const document = {
  readyState: 'complete',
  visibilityState: 'visible',
  body,
  activeElement: body,
  getElementById: id => nodes.get(id) || null,
  createElement: tag => new FakeNode(tag),
  addEventListener() {},
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
  document,
  location: { href: 'https://foxbear.test/' },
  performance: { now: () => 0 },
  navigator: {},
  localStorage: { getItem: () => 'off', setItem() {} },
  setTimeout: () => 1,
  clearTimeout() {},
  addEventListener() {},
  dispatchEvent() {},
  confirm: () => true,
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(perf, sandbox, { filename: 'performance-diagnostics.js' });

function baseSnapshot(overrides = {}) {
  const at = Date.now();
  return {
    at,
    longTasks: [],
    audio: { total: 1, playing: 1, audible: 1 },
    dom: { canvases: 1, spectrumPanels: 0 },
    runtime: { ok: true, appReady: true },
    importQueue: null,
    bulkImportHud: null,
    audioDecode: { activeDecodes: 0, failedCount: 0, events: [] },
    audioContexts: { activeCount: 1, interruptedCount: 0 },
    masteringQueue: { active: 0 },
    memoryGuard: { masteredBufferCount: 0 },
    workerJobs: { healthLevel: 'normal', stalledCount: 0, activeTransferBytes: 0 },
    wakeLock: { active: false, mode: 'off', lastError: null, lastRequestAt: 0 },
    renderScheduler: { pending: false },
    spectrum: { live: false },
    visibility: 'visible',
    frameBudgetHint: 'ok',
    ...overrides
  };
}

const benign = baseSnapshot({
  importQueue: { active: 1, pending: 2 },
  bulkImportHud: { total: 3, complete: false },
  audioDecode: { activeDecodes: 1, failedCount: 1, events: [{ type: 'decode-failed', at: Date.now() - 180000 }] },
  masteringQueue: { active: 1 },
  wakeLock: { active: true, mode: 'auto', lastError: null, lastRequestAt: Date.now() },
  renderScheduler: { pending: true },
  longTasks: [{ durationMs: 400, at: Date.now() - 120000 }]
});
const benignSummary = sandbox.FoxBearPerformanceDiagnostics.getSummary(benign);
assert.strictEqual(benignSummary.ok, true, 'normal active work and expired events must not become warnings');
assert(benignSummary.activities.includes('mastering-active'));
assert(benignSummary.activities.includes('audio-decode-active'));
assert(!benignSummary.warnings.includes('heavy-long-task'));
assert(!benignSummary.warnings.includes('audio-decode-last-error'));

const dangerSnapshot = baseSnapshot({ workerJobs: { healthLevel: 'danger', stalledCount: 1, activeTransferBytes: 0 } });
const dangerSummary = sandbox.FoxBearPerformanceDiagnostics.getSummary(dangerSnapshot);
sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(dangerSnapshot, dangerSummary);
assert.strictEqual(sandbox.FoxBearPerformanceDiagnostics.getLifecycleState().healthNoticeVisible, false, 'one danger sample must not interrupt the user');
sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(dangerSnapshot, dangerSummary);
assert.strictEqual(sandbox.FoxBearPerformanceDiagnostics.getLifecycleState().healthNoticeVisible, true, 'confirmed danger must show a non-blocking notice');
assert.strictEqual(badge.hidden, false, 'settings badge must surface confirmed health state');
assert.strictEqual(badge.dataset.tone, 'danger');

const healthySnapshot = baseSnapshot();
const healthySummary = sandbox.FoxBearPerformanceDiagnostics.getSummary(healthySnapshot);
sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(healthySnapshot, healthySummary);
sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(healthySnapshot, healthySummary);
assert.strictEqual(sandbox.FoxBearPerformanceDiagnostics.getLifecycleState().healthNoticeVisible, false, 'notice must disappear after stable recovery');
assert.strictEqual(badge.hidden, true, 'normal state must leave no persistent badge');

console.log('PASS v1.6.2 non-blocking ambient health status, transient warnings, and compact diagnostics design');
