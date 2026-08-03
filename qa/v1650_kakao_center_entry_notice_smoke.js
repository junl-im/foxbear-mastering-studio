#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/boot/kakao-entry-notice.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/boot/kakao-entry-notice.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(index.includes('src/boot/kakao-entry-notice.js'), 'index must load the Kakao centered notice boot module');
assert(index.includes('assets/css/boot/kakao-entry-notice.css'), 'index must load the Kakao centered notice CSS');
assert(index.indexOf('src/boot/kakao-entry-guard.js') < index.indexOf('src/boot/kakao-entry-notice.js'), 'Kakao guard must initialize before the notice');
assert(sw.includes("'./src/boot/kakao-entry-notice.js'"), 'service worker must cache the Kakao notice module');
assert(sw.includes("'./assets/css/boot/kakao-entry-notice.css'"), 'service worker must cache the Kakao notice stylesheet');
assert(source.includes('AUTO_DISMISS_MS = 8000'), 'Kakao notice must auto-dismiss after eight seconds');
assert(source.includes("dismiss('screen-touch')"), 'screen touch dismissal is missing');
assert(source.includes("dismiss('auto-timeout')"), 'automatic dismissal is missing');
assert(source.includes("matchMedia('(display-mode: standalone)')"), 'installed PWA suppression is missing');
assert(source.includes('마스터링된 파일 다운로드가 원활하지 않을 수 있습니다'), 'download compatibility warning text is missing');
assert(source.includes('다른 브라우저로 열기'), 'external/default browser guidance is missing');
assert(source.includes('홈 화면에 설치(PWA)'), 'PWA installation guidance is missing');
assert(css.includes('place-items: center'), 'notice must be centered in the viewport');
assert(css.includes('.foxbear-kakao-entry-notice.is-leaving'), 'smooth leaving state is missing');
assert(css.includes('animation: foxbear-kakao-notice-timer 8s'), 'visible auto-dismiss timer animation is missing');
assert(css.includes('pointer-events: none'), 'notice layer must not permanently block studio interaction');

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
}

class FakeNode {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.textContent = '';
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.classList = new FakeClassList();
  }
  setAttribute(name, value) { this.attributes.set(String(name), String(value)); }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
}

function runNotice({ userAgent = 'Mozilla/5.0 Android KAKAOTALK', standalone = false, entryMode = 'in-app' } = {}) {
  const body = new FakeNode('body');
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  const document = {
    readyState: 'complete',
    body,
    documentElement: new FakeNode('html'),
    createElement: tag => new FakeNode(tag),
    addEventListener(type, handler, options) { listeners.set(type, { handler, options }); },
    removeEventListener(type, handler) {
      const current = listeners.get(type);
      if (current && current.handler === handler) listeners.delete(type);
    }
  };
  const sandbox = {
    console,
    window: null,
    globalThis: null,
    document,
    navigator: { userAgent, standalone: false },
    FoxBearKakaoEntry: /KAKAOTALK|KakaoTalk/i.test(userAgent)
      ? { restricted: true, mode: entryMode }
      : null,
    PointerEvent: function PointerEvent() {},
    matchMedia: () => ({ matches: standalone }),
    requestAnimationFrame: callback => { callback(); return 1; },
    setTimeout(callback, delay) {
      timerId += 1;
      timers.set(timerId, { callback, delay, cleared: false });
      return timerId;
    },
    clearTimeout(id) {
      const timer = timers.get(id);
      if (timer) timer.cleared = true;
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'kakao-entry-notice.js' });
  return { sandbox, body, listeners, timers };
}

const kakao = runNotice();
assert.strictEqual(kakao.body.children.length, 1, 'Kakao browser must show one centered notice');
assert.strictEqual(kakao.body.children[0].id, 'foxbearKakaoEntryNotice');
assert.strictEqual(kakao.sandbox.FoxBearKakaoEntryNotice.active, true, 'notice should be active after entry');
assert.strictEqual(kakao.sandbox.FoxBearKakaoEntryNotice.autoDismissMs, 8000);
assert(kakao.listeners.has('pointerdown'), 'screen pointer listener must be registered');
kakao.listeners.get('pointerdown').handler({});
assert.strictEqual(kakao.sandbox.FoxBearKakaoEntryNotice.active, false, 'first screen touch must dismiss the notice');
assert.strictEqual(kakao.sandbox.FoxBearKakaoEntryNotice.dismissReason, 'screen-touch');
assert(kakao.body.children[0].classList.contains('is-leaving'), 'touch dismissal must enter the smooth leaving state');

const auto = runNotice();
const autoTimer = [...auto.timers.values()].find(timer => timer.delay === 8000 && !timer.cleared);
assert(autoTimer, 'eight-second auto-dismiss timer must be scheduled');
autoTimer.callback();
assert.strictEqual(auto.sandbox.FoxBearKakaoEntryNotice.active, false, 'auto timer must dismiss the notice');
assert.strictEqual(auto.sandbox.FoxBearKakaoEntryNotice.dismissReason, 'auto-timeout');

const normal = runNotice({ userAgent: 'Mozilla/5.0 Chrome Safari' });
assert.strictEqual(normal.body.children.length, 0, 'normal browsers must not show Kakao guidance');
assert.strictEqual(normal.sandbox.FoxBearKakaoEntryNotice.shouldShow(), false);

const installedPwa = runNotice({ standalone: true });
assert.strictEqual(installedPwa.body.children.length, 0, 'installed PWA mode must not show Kakao in-app guidance');

const redirectingGuide = runNotice({ entryMode: 'external-guide' });
assert.strictEqual(redirectingGuide.body.children.length, 0, 'explicit external guide redirect must not flash the centered notice');

console.log('PASS v1.6.50 Kakao centered entry notice, touch fade, and timed dismissal smoke');
