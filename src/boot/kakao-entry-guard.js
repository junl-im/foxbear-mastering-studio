// FoxBear KakaoTalk entry guard: allow the studio to boot in-app by default.
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

  var explicitGuide = current.searchParams.get('foxbearGuide') === '1';
  var target = new URL(current.href);
  target.searchParams.delete('foxbearGuide');
  target.searchParams.delete('foxbearInApp');
  target.searchParams.set('foxbearExternal', '1');
  target.hash = '';

  var gate = new URL('./external-browser.html', current.href);
  gate.searchParams.set('target', target.href);
  gate.searchParams.set('source', 'kakao-explicit-guide');

  global.FoxBearKakaoEntry = Object.freeze({
    restricted: true,
    bypassed: !explicitGuide,
    mode: explicitGuide ? 'external-guide' : 'in-app',
    externalAttempted: current.searchParams.get('foxbearExternal') === '1',
    target: target.href,
    gate: gate.href
  });

  // Kakao WebView can run FoxBear's playback and mastering safety path. Do not
  // block every entry only because of the user agent. The external-browser page
  // remains available from the runtime recovery action or an explicit guide URL.
  if (!explicitGuide) return;

  try {
    global.location.replace(gate.href);
  } catch (error) {
    try { global.location.href = gate.href; } catch (fallbackError) {}
  }
})(typeof window !== 'undefined' ? window : globalThis);
