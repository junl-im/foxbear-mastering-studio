'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const guardSource = read('src/boot/kakao-entry-guard.js');
const recoveryHtml = read('404.html');

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

assert(!guardSource.includes('?.'), 'early Kakao entry guard must remain compatible with older WebViews');
assert(guardSource.includes("if (!explicitGuide) return;"), 'Kakao entry must be allowed unless the external guide was explicitly requested');

const direct = runGuard('https://example.test/app/index.html', 'Mozilla/5.0 Android KAKAOTALK');
assert.strictEqual(direct.replaced, '', 'direct Kakao entry must not be redirected');
assert.strictEqual(direct.entry.mode, 'in-app', 'direct Kakao entry mode must be in-app');
assert.strictEqual(direct.entry.bypassed, true, 'direct Kakao entry must bypass the blocking gate');

const recovered = runGuard('https://example.test/app/index.html?foxbearRouteRecovery=1&foxbearInApp=1', 'Mozilla/5.0 iPhone KakaoTalk');
assert.strictEqual(recovered.replaced, '', 'route recovery must not loop back to the external guide');
assert.strictEqual(recovered.entry.mode, 'in-app', 'route recovery must stay in Kakao in-app mode');

const guide = runGuard('https://example.test/app/index.html?foxbearGuide=1', 'Mozilla/5.0 Android KAKAOTALK');
assert(guide.replaced.includes('/app/external-browser.html?'), 'explicit guide must still reach the external-browser landing');
assert.strictEqual(guide.entry.mode, 'external-guide', 'explicit guide mode must be reported');

assert(recoveryHtml.includes("new URL(base+'index.html',location.origin)"), '404 recovery must target index.html directly');
assert(recoveryHtml.includes("target.searchParams.set('foxbearInApp','1')"), 'Kakao route recovery must carry the legacy in-app bypass marker');
assert(!recoveryHtml.includes('기본 브라우저 안내 화면으로 이동합니다'), '404 recovery must not announce a forced external-browser redirect');
assert(recoveryHtml.includes('카카오톡 안의 FoxBear 작업 화면으로 이동합니다'), '404 recovery must explain that Kakao in-app entry will resume');

console.log('PASS v1.5.60 Kakao in-app entry recovery hotfix smoke');
