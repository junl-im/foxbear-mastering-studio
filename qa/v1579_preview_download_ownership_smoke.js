#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const transitionSource = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');
const downloadSource = fs.readFileSync('src/download/download-service.js', 'utf8');
const dialogSource = fs.readFileSync('src/ui/download-dialog-view.js', 'utf8');
const appSource = fs.readFileSync('src/app.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.strictEqual(pkg.version, '1.6.89');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert(pkg.qaChecks.includes('node qa/v1579_preview_download_ownership_smoke.js'));
assert(transitionSource.includes('cancelPlaybackRequest'));
assert(transitionSource.includes('ownsPlaybackRequest'));
assert(transitionSource.includes('!isAudioConnected(audio)'));
assert(appSource.includes("cancelAudioPlaybackRequest(audio, reason)"));
assert(downloadSource.includes("global.addEventListener?.('pagehide'"));
assert(downloadSource.includes('revokeAllDownloadUrls'));
assert(downloadSource.includes('bindAssistAsyncAction'));
assert(dialogSource.includes("panel.setAttribute('aria-busy', String(active))"));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createTransitionHarness() {
  let clock = 0;
  let nextFrameId = 1;
  const frames = new Map();
  const fakeWindow = {
    navigator: { userAgent: '' },
    performance: { now: () => clock },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    }
  };
  vm.runInNewContext(transitionSource, {
    window: fakeWindow,
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Promise,
    Error
  });
  return { service: fakeWindow.FoxBearPlaybackTransitionService, frames, setClock(value) { clock = value; } };
}

function createAudio(playPromise = Promise.resolve()) {
  return {
    volume: 1,
    paused: true,
    ended: false,
    readyState: 4,
    isConnected: true,
    dataset: {},
    pauseCalls: 0,
    playCalls: 0,
    pause() {
      this.pauseCalls += 1;
      this.paused = true;
    },
    play() {
      this.playCalls += 1;
      this.paused = false;
      return playPromise;
    },
    addEventListener() {},
    removeEventListener() {},
    load() {}
  };
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }
  add(...values) {
    values.forEach(value => this.values.add(value));
  }
  remove(...values) {
    values.forEach(value => this.values.delete(value));
  }
  toggle(value, force) {
    const active = force === undefined ? !this.values.has(value) : Boolean(force);
    if (active) this.values.add(value);
    else this.values.delete(value);
    return active;
  }
  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = String(tagName || '').toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.nodeType = 1;
    this.style = {};
    this.textContent = '';
    this.className = '';
    this.id = '';
    this.disabled = false;
    this.download = '';
    this.hidden = false;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    this.ownerDocument.register(child);
    return child;
  }
  append(...children) {
    children.forEach(child => this.appendChild(child));
  }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.ownerDocument.unregister(this);
    this.parentNode = null;
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    this.listeners.set(type, handlers.filter(candidate => candidate !== handler));
  }
  click() {
    const event = {
      type: 'click',
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {}
    };
    (this.listeners.get('click') || []).slice().forEach(handler => handler(event));
  }
  querySelectorAll(selector) {
    const results = [];
    const tags = String(selector || '').split(',').map(value => value.trim().toUpperCase()).filter(Boolean);
    const visit = node => {
      node.children.forEach(child => {
        if (tags.includes(child.tagName)) results.push(child);
        visit(child);
      });
    };
    visit(this);
    return results;
  }
  contains(target) {
    if (target === this) return true;
    return this.children.some(child => child.contains(target));
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
}

class FakeDocument {
  constructor() {
    this.ids = new Map();
    this.listeners = new Map();
    this.body = new FakeElement('body', this);
    this.activeElement = this.body;
    this.visibilityState = 'visible';
  }
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
  getElementById(id) {
    return this.ids.get(id) || null;
  }
  register(element) {
    if (element.id) this.ids.set(element.id, element);
    element.children.forEach(child => this.register(child));
  }
  unregister(element) {
    if (element.id) this.ids.delete(element.id);
    element.children.forEach(child => this.unregister(child));
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    this.listeners.set(type, handlers.filter(candidate => candidate !== handler));
  }
}

function createDownloadHarness() {
  const document = new FakeDocument();
  const globalListeners = new Map();
  const frames = new Map();
  const revoked = [];
  let nextFrameId = 1;
  let shareCalls = 0;
  let resolveShare = null;
  let rejectShare = null;

  const navigator = {
    userAgent: 'Chrome',
    canShare() {
      return true;
    },
    share() {
      shareCalls += 1;
      return new Promise((resolve, reject) => {
        resolveShare = resolve;
        rejectShare = reject;
      });
    },
    clipboard: {
      writeText: async () => true
    }
  };

  class TestFile extends Blob {
    constructor(parts, name, options) {
      super(parts, options);
      this.name = name;
    }
  }

  const fakeWindow = {
    navigator,
    document,
    isSecureContext: true,
    location: { href: 'https://example.test/' },
    URL: {
      createObjectURL: () => 'blob:created',
      revokeObjectURL: url => revoked.push(url)
    },
    File: TestFile,
    Blob,
    Set,
    Map,
    WeakMap,
    Uint8Array,
    ArrayBuffer,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Promise,
    Error,
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    addEventListener(type, handler) {
      if (!globalListeners.has(type)) globalListeners.set(type, []);
      globalListeners.get(type).push(handler);
    },
    removeEventListener() {},
    matchMedia() {
      return { matches: false };
    }
  };

  vm.runInNewContext(downloadSource, {
    window: fakeWindow,
    globalThis: fakeWindow,
    navigator,
    document,
    location: fakeWindow.location,
    URL: fakeWindow.URL,
    File: TestFile,
    Blob,
    Set,
    Map,
    WeakMap,
    Uint8Array,
    ArrayBuffer,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Promise,
    Error,
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: fakeWindow.requestAnimationFrame,
    cancelAnimationFrame: fakeWindow.cancelAnimationFrame
  });

  return {
    service: fakeWindow.FoxBearDownloadService,
    document,
    revoked,
    getShareCalls: () => shareCalls,
    finishShare: () => resolveShare?.(),
    failShare: error => rejectShare?.(error),
    dispatch(type, event) {
      (globalListeners.get(type) || []).slice().forEach(handler => handler(event));
    }
  };
}

(async () => {
  const transition = createTransitionHarness();
  const service = transition.service;

  const delayed = deferred();
  const removedAudio = createAudio(delayed.promise);
  const removedPlay = service.playWithFadeIn(removedAudio, { fromZero: false });
  service.cancelPlaybackRequest(removedAudio, { pause: true, reason: 'preview-removed' });
  delayed.resolve();
  assert.strictEqual(await removedPlay, false, 'removed preview play request completed as current');
  assert.strictEqual(removedAudio.pauseCalls, 1, 'removed preview was not paused during disposal');
  assert.strictEqual(transition.frames.size, 0, 'removed preview scheduled a stale fade frame');

  const detached = deferred();
  const detachedAudio = createAudio(detached.promise);
  const detachedPlay = service.playWithFadeIn(detachedAudio, { fromZero: false });
  detachedAudio.isConnected = false;
  detached.resolve();
  assert.strictEqual(await detachedPlay, false, 'detached audio play request completed successfully');
  assert.strictEqual(detachedAudio.pauseCalls, 1, 'detached audio was not stopped after late play completion');

  const firstDeferred = deferred();
  const reusedAudio = createAudio(firstDeferred.promise);
  const firstPlay = service.playWithFadeIn(reusedAudio, { fromZero: false });
  reusedAudio.play = function playLatest() {
    this.playCalls += 1;
    this.paused = false;
    return Promise.resolve();
  };
  const secondPlay = service.playWithFadeIn(reusedAudio, { fromZero: false });
  assert.strictEqual(await secondPlay, true, 'newer play request did not take ownership');
  firstDeferred.resolve();
  assert.strictEqual(await firstPlay, false, 'older play request was not isolated');
  assert.strictEqual(reusedAudio.pauseCalls, 0, 'older play completion paused the newer request');

  const download = createDownloadHarness();
  const state = { activeDownloadUrls: new Set() };
  const blob = new Blob([new Uint8Array(256)], { type: 'audio/mpeg' });
  download.service.showDownloadAssist('blob:test', 'test.mp3', 'audio/mpeg', blob, { state, showToast() {} });
  const panel = download.document.getElementById('downloadAssist');
  assert(panel, 'download assist panel was not created');
  const shareButton = panel.querySelectorAll('button').find(button => button.textContent === '공유/저장');
  assert(shareButton, 'share action button was not created');

  shareButton.click();
  shareButton.click();
  assert.strictEqual(download.getShareCalls(), 1, 'rapid share taps launched duplicate native share requests');
  assert.strictEqual(shareButton.disabled, true, 'share action did not lock while pending');
  assert.strictEqual(shareButton.getAttribute('aria-busy'), 'true', 'share action did not expose aria-busy');
  assert.strictEqual(panel.getAttribute('aria-busy'), 'true', 'assist panel did not expose busy state');
  assert.strictEqual(download.service.getActiveDownloadUrlCount(), 1, 'active Blob URL was not registered');

  download.dispatch('pagehide', { persisted: true });
  assert.strictEqual(download.service.getActiveDownloadUrlCount(), 1, 'BFCache navigation revoked a reusable Blob URL');
  assert.strictEqual(download.revoked.length, 0, 'BFCache navigation called URL.revokeObjectURL');

  download.finishShare();
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(shareButton.disabled, false, 'share action remained locked after completion');
  assert.strictEqual(shareButton.getAttribute('aria-busy'), null, 'share action retained aria-busy after completion');
  assert.strictEqual(panel.getAttribute('aria-busy'), null, 'assist panel retained aria-busy after completion');

  download.dispatch('pagehide', { persisted: false });
  assert.strictEqual(download.service.getActiveDownloadUrlCount(), 0, 'page exit retained Blob URL registry entries');
  assert.deepStrictEqual(download.revoked, ['blob:test'], 'page exit did not revoke the active Blob URL exactly once');
  assert.strictEqual(state.activeDownloadUrls.size, 0, 'application active URL state was not cleared');

  const lateToasts = [];
  download.service.showDownloadAssist('blob:late', 'late.mp3', 'audio/mpeg', blob, { state, showToast(message) { lateToasts.push(message); } });
  const latePanel = download.document.getElementById('downloadAssist');
  const lateShare = latePanel.querySelectorAll('button').find(button => button.textContent === '공유/저장');
  lateShare.click();
  latePanel.__foxbearCleanup();
  latePanel.remove();
  download.failShare(new Error('native share closed after panel disposal'));
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(lateToasts.length, 0, 'closed assist panel surfaced a stale native-share failure toast');
  download.dispatch('pagehide', { persisted: false });

  console.log('PASS v1.5.79 preview request ownership, assist action locking, and Blob URL exit cleanup');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
