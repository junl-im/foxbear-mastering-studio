'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/boot/ui-shell-recovery-service.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const assetVersion = pkg.foxbearRelease.assetVersion;

assert(source.includes('RESOURCE_RETRY_GRACE_MS'), 'replacement retry grace is missing');
assert(source.includes('findScripts'), 'multi-candidate script lookup is missing');
assert(source.includes('findStylesheets'), 'multi-candidate stylesheet lookup is missing');
assert(source.includes('scriptsRetrying'), 'script retry settlement diagnostics are missing');
assert(source.includes('stylesRetrying'), 'stylesheet retry settlement diagnostics are missing');

function makeClassList() {
  const values = new Set();
  return {
    add(...items) { items.forEach(item => values.add(item)); },
    remove(...items) { items.forEach(item => values.delete(item)); },
    toggle(item, enabled) { if (enabled) values.add(item); else values.delete(item); },
    contains(item) { return values.has(item); }
  };
}

const listeners = new Map();
function addListener(type, fn) {
  const list = listeners.get(type) || [];
  list.push(fn);
  listeners.set(type, list);
}
function dispatch(type, event = {}) {
  for (const fn of listeners.get(type) || []) fn(event);
}

let now = 1000;
let timerSequence = 0;
const timers = [];
function setTimer(fn, delay = 0) {
  const id = ++timerSequence;
  timers.push({ id, at: now + Number(delay || 0), fn, cancelled: false });
  return id;
}
function clearTimer(id) {
  const timer = timers.find(item => item.id === id);
  if (timer) timer.cancelled = true;
}
function runDueTimers() {
  let ran = true;
  while (ran) {
    ran = false;
    timers.sort((a, b) => a.at - b.at || a.id - b.id);
    const timer = timers.find(item => !item.cancelled && item.at <= now);
    if (!timer) continue;
    timer.cancelled = true;
    timer.fn();
    ran = true;
  }
}

function makeLink(name, loaded = true) {
  return {
    tagName: 'LINK',
    href: `https://example.test/assets/css/${name}?v=${assetVersion}`,
    dataset: {},
    sheet: loaded ? {} : null,
    getAttribute(key) { return key === 'href' ? `assets/css/${name}?v=${assetVersion}` : null; }
  };
}
function makeScript(name) {
  return {
    tagName: 'SCRIPT',
    src: `https://example.test/${name}?v=${assetVersion}`,
    dataset: {},
    getAttribute(key) { return key === 'src' ? `${name}?v=${assetVersion}` : null; }
  };
}

const links = ['theme.css', 'layout.css', 'studio.css'].map(name => makeLink(name));
const scriptNames = [
  'src/config/build-info.js',
  'src/boot/runtime-health.js',
  'src/boot/service-worker-update-service.js',
  'src/app.js'
];
const scripts = scriptNames.map(makeScript);
const shell = {
  hidden: false,
  style: { display: '', visibility: '', opacity: '', removeProperty(name) { this[name] = ''; } },
  attrs: new Map(),
  setAttribute(key, value) { this.attrs.set(key, String(value)); },
  getAttribute(key) { return this.attrs.get(key) || null; },
  removeAttribute(key) { this.attrs.delete(key); },
  hasAttribute(key) { return this.attrs.has(key); },
  getBoundingClientRect() { return { width: 900, height: 640 }; }
};
const html = { classList: makeClassList() };
const body = {
  classList: makeClassList(),
  children: [],
  appendChild(node) { node.parentNode = this; this.children.push(node); }
};
const document = {
  readyState: 'interactive',
  documentElement: html,
  body,
  visibilityState: 'visible',
  querySelector(selector) {
    if (selector === '.app-shell') return shell;
    if (selector === '.runtime-recovery-panel') return null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === 'link[href],script[src]') return [...links, ...scripts];
    if (selector.includes('link[rel="stylesheet"]')) return links;
    if (selector.includes('script[src]')) return scripts;
    return [];
  },
  getElementById(id) { return body.children.find(node => node.id === id) || null; },
  createElement() {
    return {
      hidden: false,
      id: '', className: '', textContent: '', attrs: new Map(),
      setAttribute(key, value) { this.attrs.set(key, String(value)); },
      remove() { body.children = body.children.filter(node => node !== this); }
    };
  },
  addEventListener: addListener
};

let mutationObserverCallback = null;
class FakeMutationObserver {
  constructor(callback) {
    mutationObserverCallback = callback;
  }
  observe() {}
  disconnect() {}
}

function appendNode(collection, node) {
  collection.push(node);
  mutationObserverCallback?.([{ addedNodes: [node] }]);
  runDueTimers();
}

class FakeDate extends Date {
  static now() { return now; }
}

const sandbox = {
  console, document, Date: FakeDate, Object, Array, String, Number, Boolean, Set, Map, WeakSet, WeakMap,
  FoxBearBuildInfo: { assetVersion },
  CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
  getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; },
  addEventListener: addListener,
  dispatchEvent(event) { dispatch(event.type, event); },
  MutationObserver: FakeMutationObserver,
  setTimeout: setTimer,
  clearTimeout: clearTimer
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'ui-shell-recovery-service.js' });
const vmWindow = vm.runInContext('window', sandbox);

dispatch('DOMContentLoaded', { target: document });
dispatch('load', { target: vmWindow });
let snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.active, false, 'healthy static resources should settle after window load');

const originalApp = scripts.find(script => script.src.includes('/src/app.js'));
dispatch('error', { target: originalApp });
sandbox.FoxBearUiShellRecoveryService.recover('app-failed');
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.scriptsMissing, true, 'confirmed original app failure should be diagnosed');
assert.strictEqual(snapshot.active, true, 'confirmed app failure should keep recovery active');

const replacementApp = makeScript('src/app.js');
appendNode(scripts, replacementApp);
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.scriptsMissing, false, 'a live replacement candidate must supersede the stale failed node');
assert.strictEqual(snapshot.scriptsRetrying, true, 'replacement must remain pending until its own load event');
assert.strictEqual(snapshot.active, true, 'recovery must stay active while replacement loading is unresolved');
assert(html.classList.contains('foxbear-ui-shell-resource-retry-pending'), 'retry-pending class should be exposed');
assert(snapshot.replacementObservationCount >= 1, 'replacement insertion should be observed automatically');

replacementApp.dataset.foxbearLoadComplete = 'true';
dispatch('load', { target: replacementApp });
sandbox.FoxBearUiShellRecoveryService.recover('app-retry-loaded');
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.scriptsRetrying, false, 'loaded replacement should clear retry state');
assert.strictEqual(snapshot.scriptsMissing, false, 'loaded replacement should clear the stale original failure');
assert.strictEqual(snapshot.active, false, 'loaded replacement should settle recovery');

const originalTheme = links.find(link => link.href.includes('/theme.css'));
dispatch('error', { target: originalTheme });
const replacementTheme = makeLink('theme.css', false);
appendNode(links, replacementTheme);
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.stylesMissing, false, 'pending replacement stylesheet must not remain hard-failed');
assert.strictEqual(snapshot.stylesRetrying, true, 'replacement stylesheet should have bounded retry state');
replacementTheme.sheet = {};
dispatch('load', { target: replacementTheme });
sandbox.FoxBearUiShellRecoveryService.recover('theme-retry-loaded');
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.stylesRetrying, false, 'loaded replacement stylesheet should settle retry state');
assert.strictEqual(snapshot.stylesMissing, false, 'loaded replacement stylesheet should override the failed original node');

const originalUpdate = scripts.find(script => script.src.includes('/src/boot/service-worker-update-service.js'));
dispatch('error', { target: originalUpdate });
const stalledUpdate = makeScript('src/boot/service-worker-update-service.js');
appendNode(scripts, stalledUpdate);
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.scriptsRetrying, true, 'stalled replacement should begin in retry state');
now += 2600;
runDueTimers();
snapshot = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(snapshot.scriptsRetrying, false, 'retry state must end after the bounded grace');
assert.strictEqual(snapshot.scriptsMissing, true, 'replacement without load or error must become a confirmed failure after grace');
assert.strictEqual(snapshot.active, true, 'timed-out replacement must keep recovery active');

console.log('PASS v1.6.40 replacement-aware script/style retry settlement and timeout fencing');
