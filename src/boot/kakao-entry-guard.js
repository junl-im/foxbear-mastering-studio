// FoxBear KakaoTalk entry guard: move users to a full browser before local audio work begins.
'use strict';

(function guardKakaoEntry(global) {
  const ua = String(global.navigator?.userAgent || '');
  const isKakao = /KAKAOTALK|KakaoTalk/i.test(ua);
  if (!isKakao) return;

  let current;
  try {
    current = new URL(global.location.href);
  } catch (error) {
    return;
  }

  if (current.searchParams.get('foxbearInApp') === '1') {
    global.FoxBearKakaoEntry = Object.freeze({ restricted: true, bypassed: true });
    return;
  }

  const target = new URL(current.href);
  target.searchParams.delete('foxbearInApp');
  target.searchParams.set('foxbearExternal', '1');
  target.hash = '';

  const gate = new URL('./external-browser.html', current.href);
  gate.searchParams.set('target', target.href);
  gate.searchParams.set('source', 'kakao');

  global.FoxBearKakaoEntry = Object.freeze({ restricted: true, bypassed: false, target: target.href, gate: gate.href });
  global.location.replace(gate.href);
})(typeof window !== 'undefined' ? window : globalThis);
