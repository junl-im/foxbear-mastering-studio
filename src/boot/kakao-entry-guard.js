// FoxBear KakaoTalk entry guard: show a lightweight, always-renderable landing before local audio work begins.
'use strict';

(function guardKakaoEntry(global) {
  var navigatorRef = global.navigator || {};
  var ua = String(navigatorRef.userAgent || '');
  var isKakao = /KAKAOTALK|KakaoTalk/i.test(ua);
  if (!isKakao) return;

  var current;
  try {
    current = new URL(global.location.href);
  } catch (error) {
    return;
  }

  if (current.searchParams.get('foxbearInApp') === '1') {
    global.FoxBearKakaoEntry = Object.freeze({ restricted: true, bypassed: true });
    return;
  }

  var target = new URL(current.href);
  target.searchParams.delete('foxbearInApp');
  target.searchParams.set('foxbearExternal', '1');
  target.hash = '';

  var gate = new URL('./external-browser.html', current.href);
  gate.searchParams.set('target', target.href);
  gate.searchParams.set('source', 'kakao');

  global.FoxBearKakaoEntry = Object.freeze({
    restricted: true,
    bypassed: false,
    target: target.href,
    gate: gate.href
  });

  // Only navigate to an ordinary same-origin HTTPS/HTTP page here. Never launch a
  // custom scheme during document boot: Kakao WebView can replace the page with a
  // blank/error screen when such a scheme is blocked.
  try {
    global.location.replace(gate.href);
  } catch (error) {
    try { global.location.href = gate.href; } catch (fallbackError) {}
  }
})(typeof window !== 'undefined' ? window : globalThis);
