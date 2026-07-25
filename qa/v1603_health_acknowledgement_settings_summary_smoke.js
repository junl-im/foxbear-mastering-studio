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
const app = read('src/app.js');
const perfCss = read('assets/css/boot/performance-diagnostics.css');
const mobileCss = read('assets/css/mobile-native.css');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.9');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');
assert(perf.includes('const NOTICE_DISMISS_TTL_MS = 30 * 60 * 1000'), 'same warning dismissal must have a bounded repeat interval');
assert(perf.includes('const AMBIENT_WATCH_CONFIRM_SAMPLES = 2'), 'watch badge must require consecutive samples');
assert(perf.includes('persistNoticeDismissal('), 'notice acknowledgement must persist across reloads');
assert(perf.includes('updateHealthNoticeStackOffset()'), 'health notice must coordinate with the toast stack');
assert.strictEqual((perf.match(/activities\.push\('audio-decode-active'\)/g) || []).length, 1, 'decode activity must not be counted twice');
assert(mobileView.includes("performanceHealthSummary.id = 'performanceHealthSummary'"), 'Settings must include a compact health reason row');
assert(app.includes('refreshSettingsHealthSummary?.()'), 'Settings creation must immediately restore the current health reason');
assert(app.includes("ambientHealth] || '정상'"), 'routine Settings refresh must preserve the current health level');
assert(mobileCss.includes('.mobile-native-health-summary'), 'Settings health reason must be styled');
assert(perfCss.includes('var(--foxbear-health-toast-offset, 0px)'), 'health notice must reserve visible toast height');
assert(handoff.startsWith('# Handoff - v1.6.9'), 'handoff must lead with the current release');

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  getPropertyValue(name) { return this.values.get(name) || ''; }
}

class FakeClassList {
  constructor(owner) { this.owner = owner; this.values = new Set(); }
  add(...values) { values.forEach(value => this.values.add(value)); this.owner.className = Array.from(this.values).join(' '); }
  remove(...values) { values.forEach(value => this.values.delete(value)); this.owner.className = Array.from(this.values).join(' '); }
  contains(value) { return this.values.has(value) || String(this.owner.className || '').split(/\s+/).includes(value); }
  toggle(value, force) {
    const next = force === undefined ? !this.contains(value) : Boolean(force);
    if (next) this.add(value); else this.remove(value);
    return next;
  }
}

class FakeNode {
  constructor(tag = 'div', id = '') {
    this.tagName = String(tag).toUpperCase();
    this.id = id;
    this.hidden = false;
    this.dataset = {};
    this.children = [];
    this.attributes = new Map();
    this.className = '';
    this.classList = new FakeClassList(this);
    this.style = new FakeStyle();
    this.textContent = '';
    this.title = '';
    this.disabled = false;
    this.offsetHeight = 0;
  }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); return node; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  addEventListener(type, handler) { this[`on${type}`] = handler; }
  querySelector(selector) {
    if (selector === '[data-setting-state]') return this.children.find(child => child.dataset?.settingState !== undefined) || null;
    if (selector === '.foxbear-toast-item') return this.children.find(child => child.classList?.contains('foxbear-toast-item')) || null;
    return null;
  }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { height: this.offsetHeight, top: 0, bottom: this.offsetHeight, left: 0, right: 0, width: 0 }; }
  focus() {}
}

function createHarness(sharedStore = new Map()) {
  const toggle = new FakeNode('button', 'mobileNativeQuickToggle');
  const badge = new FakeNode('span', 'performanceHealthBadge');
  badge.hidden = true;
  toggle.appendChild(badge);

  const perfButton = new FakeNode('button');
  perfButton.dataset.nativeAction = 'performance-diagnostics';
  const stateNode = new FakeNode('span');
  stateNode.dataset.settingState = '';
  stateNode.textContent = '열기';
  perfButton.appendChild(stateNode);

  const healthSummary = new FakeNode('p', 'performanceHealthSummary');
  healthSummary.hidden = true;

  const toast = new FakeNode('div', 'toast');
  toast.classList.add('foxbear-toast-stack', 'show');
  toast.offsetHeight = 96;
  const toastItem = new FakeNode('div');
  toastItem.classList.add('foxbear-toast-item');
  toast.appendChild(toastItem);

  const nodes = new Map([
    [toggle.id, toggle],
    [badge.id, badge],
    [healthSummary.id, healthSummary],
    [toast.id, toast]
  ]);
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
    querySelector: selector => selector === '[data-native-action="performance-diagnostics"]' ? perfButton : null,
    querySelectorAll: () => [],
    getElementsByTagName: () => []
  };
  const localStorage = {
    getItem: key => sharedStore.has(key) ? sharedStore.get(key) : null,
    setItem: (key, value) => sharedStore.set(key, String(value)),
    removeItem: key => sharedStore.delete(key)
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
    localStorage,
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
  return { sandbox, badge, perfButton, stateNode, healthSummary, toast, store: sharedStore };
}

function snapshot(overrides = {}) {
  return {
    at: Date.now(),
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

const first = createHarness();
const watch = snapshot({ longTasks: [{ durationMs: 120, at: Date.now() }] });
const watchSummary = first.sandbox.FoxBearPerformanceDiagnostics.getSummary(watch);
let result = first.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(watch, watchSummary);
assert.strictEqual(result.level, 'normal', 'one watch sample must not create a persistent badge');
result = first.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(watch, watchSummary);
assert.strictEqual(result.level, 'watch');
assert.strictEqual(first.badge.dataset.tone, 'watch');
assert.strictEqual(first.stateNode.textContent, '주의');
assert.strictEqual(first.healthSummary.hidden, false);
assert(first.healthSummary.textContent.includes('최근 1분'), 'Settings must explain the current warning');

const danger = snapshot({ workerJobs: { healthLevel: 'danger', stalledCount: 1, activeTransferBytes: 0 } });
const dangerSummary = first.sandbox.FoxBearPerformanceDiagnostics.getSummary(danger);
first.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(danger, dangerSummary);
first.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(danger, dangerSummary);
let lifecycle = first.sandbox.FoxBearPerformanceDiagnostics.getLifecycleState();
assert.strictEqual(lifecycle.healthNoticeVisible, true);
const notice = first.sandbox.document.body.children.find(node => node.className === 'foxbear-health-notice');
assert(notice, 'danger notice must exist');
assert.strictEqual(notice.style.getPropertyValue('--foxbear-health-toast-offset'), '106px', 'notice must clear a visible toast stack');
const close = notice.children[3];
close.onclick();
lifecycle = first.sandbox.FoxBearPerformanceDiagnostics.getLifecycleState();
assert.strictEqual(lifecycle.healthNoticeVisible, false);
assert(lifecycle.noticeDismissedKey.includes('worker-job-stalled'));

const second = createHarness(first.store);
const dangerSummaryReloaded = second.sandbox.FoxBearPerformanceDiagnostics.getSummary(danger);
second.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(danger, dangerSummaryReloaded);
second.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(danger, dangerSummaryReloaded);
assert.strictEqual(second.sandbox.FoxBearPerformanceDiagnostics.getLifecycleState().healthNoticeVisible, false, 'acknowledged identical danger must not immediately reappear after reload');
assert.strictEqual(second.badge.hidden, false, 'acknowledgement must not hide the persistent settings badge');

const differentDanger = snapshot({ runtime: { ok: false, appReady: false }, workerJobs: { healthLevel: 'normal', stalledCount: 0, activeTransferBytes: 0 } });
const differentSummary = second.sandbox.FoxBearPerformanceDiagnostics.getSummary(differentDanger);
second.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(differentDanger, differentSummary);
second.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(differentDanger, differentSummary);
assert.strictEqual(second.sandbox.FoxBearPerformanceDiagnostics.getLifecycleState().healthNoticeVisible, true, 'a different danger condition must still be surfaced');

const healthy = snapshot();
const healthySummary = second.sandbox.FoxBearPerformanceDiagnostics.getSummary(healthy);
second.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(healthy, healthySummary);
second.sandbox.FoxBearPerformanceDiagnostics.applyAmbientHealth(healthy, healthySummary);
assert.strictEqual(second.badge.hidden, true);
assert.strictEqual(second.healthSummary.hidden, true);
assert.strictEqual(second.stateNode.textContent, '정상');

console.log('PASS v1.6.3 health acknowledgement, Settings summary, hysteresis, and toast-stack coordination');
