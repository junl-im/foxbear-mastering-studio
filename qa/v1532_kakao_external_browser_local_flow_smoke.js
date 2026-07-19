'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const gateHtml = fs.readFileSync(path.join(root, 'external-browser.html'), 'utf8');
const guardSource = fs.readFileSync(path.join(root, 'src/boot/kakao-entry-guard.js'), 'utf8');
const landingSource = fs.readFileSync(path.join(root, 'src/boot/kakao-external-browser.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const overwriteTool = fs.readFileSync(path.join(root, 'tools/create-overwrite-zip.sh'), 'utf8');

function runGuard(href, userAgent) {
  let replaced = '';
  const location = {
    href,
    replace(next) { replaced = String(next); }
  };
  const sandbox = {
    window: null,
    globalThis: null,
    URL,
    navigator: { userAgent },
    location
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(guardSource, sandbox, { filename: 'kakao-entry-guard.js' });
  return { replaced, entry: sandbox.FoxBearKakaoEntry };
}

assert(index.includes('src/boot/kakao-entry-guard.js'), 'index must load Kakao entry guard');
assert(index.indexOf('src/boot/kakao-entry-guard.js') < index.indexOf('src/config/build-info.js'), 'Kakao guard must run before the main application boot');

const kakao = runGuard('https://example.com/app/index.html?mode=master', 'Mozilla/5.0 Android KAKAOTALK');
assert(kakao.replaced.includes('/app/external-browser.html?'), 'Kakao entry should be redirected to lightweight external-browser landing');
assert(decodeURIComponent(kakao.replaced).includes('foxbearExternal=1'), 'external target marker must be preserved');
assert.strictEqual(kakao.entry?.bypassed, false, 'normal Kakao entry must not bypass the gate');

const bypass = runGuard('https://example.com/app/index.html?foxbearInApp=1', 'Mozilla/5.0 iPhone KakaoTalk');
assert.strictEqual(bypass.replaced, '', 'explicit in-app continue must not redirect again');
assert.strictEqual(bypass.entry?.bypassed, true, 'bypass state must be exposed');

const normal = runGuard('https://example.com/app/index.html', 'Mozilla/5.0 Chrome Safari');
assert.strictEqual(normal.replaced, '', 'normal browsers must not be redirected');

['openExternalBrowser', 'openAndroidBrowser', 'copyExternalUrl', 'continueInKakao'].forEach(id => {
  assert(gateHtml.includes(`id="${id}"`), `external-browser landing is missing ${id}`);
});
function expectedSri(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return `sha384-${crypto.createHash('sha384').update(bytes).digest('base64')}`;
}
assert(gateHtml.includes(`integrity="${expectedSri('assets/css/external-browser.css')}"`), 'landing CSS SRI must match');
assert(gateHtml.includes(`integrity="${expectedSri('src/boot/kakao-external-browser.js')}"`), 'landing launcher SRI must match');
assert(landingSource.includes('kakaotalk://web/openExternal?url='), 'landing must include Kakao external-browser scheme');
assert(landingSource.includes('intent://'), 'landing must include Android intent fallback');
assert(landingSource.includes('parsed.origin !== global.location.origin'), 'landing target must reject cross-origin open redirects');
assert(landingSource.includes("addEventListener('click', launchWithKakaoScheme)"), 'external launch must be available from a user click');
assert(sw.includes("'./external-browser.html'"), 'service worker must cache the lightweight landing');
assert(sw.includes("'./src/boot/kakao-entry-guard.js'"), 'service worker must cache the entry guard');
assert(overwriteTool.includes('copy_path "external-browser.html"'), 'overwrite package must include the landing page');

console.log('PASS v1.5.32 Kakao external-browser local flow smoke');
