'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const guardSource = fs.readFileSync(path.join(root, 'src/boot/kakao-entry-guard.js'), 'utf8');
const landingSource = fs.readFileSync(path.join(root, 'src/boot/kakao-external-browser.js'), 'utf8');
const gateHtml = fs.readFileSync(path.join(root, 'external-browser.html'), 'utf8');

assert(!guardSource.includes('?.'), 'early Kakao entry guard must avoid optional chaining for older WebViews');
assert(!landingSource.includes('setTimeout(launch'), 'landing must never auto-launch an external scheme from a timer');
assert(!landingSource.includes('global.location.href = buildKakaoExternalUrl'), 'Kakao custom scheme must not replace the visible landing page');
assert(landingSource.includes('The landing must remain visible until the user acts'), 'landing visibility invariant must be documented in code');
assert(gateHtml.includes('페이지가 열렸습니다'), 'landing must visibly confirm that the page loaded');
assert(gateHtml.includes('다른 브라우저로 열기'), 'landing must include Kakao menu fallback guidance');
assert(gateHtml.includes('href="./index.html?foxbearExternal=1"'), 'landing must retain a no-JavaScript direct fallback link');

function createElement(id) {
  return {
    id,
    hidden: false,
    href: '',
    textContent: '',
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
    setAttribute() {},
    select() {}
  };
}

function runLanding(userAgent) {
  const elements = Object.fromEntries([
    'externalBrowserStatus',
    'openExternalBrowser',
    'openKakaoExternalScheme',
    'copyExternalUrl',
    'openTargetDirect',
    'continueInKakao'
  ].map(id => [id, createElement(id)]));
  const appended = [];
  const location = {
    href: 'https://example.com/app/external-browser.html?target=' + encodeURIComponent('https://example.com/app/index.html?mode=master'),
    origin: 'https://example.com',
    replace(next) { this.replaced = String(next); }
  };
  const opened = [];
  const timers = [];
  const document = {
    getElementById(id) { return elements[id] || null; },
    createElement() { return createElement('dynamic'); },
    execCommand() { return true; },
    body: {
      appendChild(node) { appended.push(node); node.parentNode = this; },
      removeChild(node) { const i = appended.indexOf(node); if (i >= 0) appended.splice(i, 1); }
    }
  };
  const sandbox = {
    window: null,
    globalThis: null,
    URL,
    document,
    navigator: { userAgent },
    location,
    open(url, target) { opened.push({ url: String(url), target }); return {}; },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(landingSource, sandbox, { filename: 'kakao-external-browser.js' });
  return { sandbox, elements, location, opened, timers };
}

const android = runLanding('Mozilla/5.0 Android KAKAOTALK');
assert.strictEqual(android.timers.length, 0, 'Kakao landing must not schedule automatic scheme navigation');
assert(android.elements.externalBrowserStatus.textContent.includes('정상적으로 열렸습니다'), 'Kakao landing should remain visibly usable');
assert.strictEqual(typeof android.elements.openExternalBrowser.listeners.click, 'function', 'primary action must be click-driven');
android.elements.openExternalBrowser.listeners.click({ preventDefault() {} });
assert(android.location.href.startsWith('intent://'), 'Android click should use an intent only after user action');

const ios = runLanding('Mozilla/5.0 iPhone KakaoTalk');
ios.elements.openExternalBrowser.listeners.click({ preventDefault() {} });
assert(ios.opened.some(item => item.url.startsWith('kakaotalk://web/openExternal?url=')), 'iOS click may try Kakao scheme in a separate context');
assert(ios.location.href.startsWith('https://example.com/app/external-browser.html'), 'iOS Kakao scheme attempt must not replace the landing URL');

const chrome = runLanding('Mozilla/5.0 Chrome Safari');
assert(String(chrome.location.replaced || '').includes('/app/index.html?'), 'non-Kakao browsers should leave the landing for the target page');

console.log('PASS v1.5.34 Kakao landing recovery smoke');
