// FoxBear lightweight external-browser launcher for KakaoTalk in-app browser.
'use strict';

(function initKakaoExternalBrowserLanding(global) {
  var doc = global.document;
  if (!doc) return;

  var navigatorRef = global.navigator || {};
  var ua = String(navigatorRef.userAgent || '');
  var isKakao = /KAKAOTALK|KakaoTalk/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var params = new URL(global.location.href).searchParams;
  var fallbackTarget = new URL('./index.html?foxbearExternal=1', global.location.href);

  function resolveTarget() {
    var raw = params.get('target');
    if (!raw) return fallbackTarget;
    try {
      var parsed = new URL(raw, global.location.href);
      if (parsed.origin !== global.location.origin) return fallbackTarget;
      if (!/^https?:$/.test(parsed.protocol)) return fallbackTarget;
      parsed.searchParams.delete('foxbearInApp');
      parsed.searchParams.set('foxbearExternal', '1');
      parsed.hash = '';
      return parsed;
    } catch (error) {
      return fallbackTarget;
    }
  }

  var target = resolveTarget();
  var status = doc.getElementById('externalBrowserStatus');
  var primary = doc.getElementById('openExternalBrowser');
  var kakaoScheme = doc.getElementById('openKakaoExternalScheme');
  var copy = doc.getElementById('copyExternalUrl');
  var direct = doc.getElementById('openTargetDirect');
  var continueInApp = doc.getElementById('continueInKakao');

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function buildKakaoExternalUrl(url) {
    return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  }

  function buildAndroidIntentUrl(url) {
    var parsed = new URL(url);
    var scheme = parsed.protocol.replace(':', '') || 'https';
    var path = parsed.host + parsed.pathname + parsed.search + parsed.hash;
    var fallback = encodeURIComponent(parsed.href);
    return 'intent://' + path + '#Intent;scheme=' + scheme + ';action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=' + fallback + ';end';
  }

  function launchKakaoSchemeWithoutReplacingLanding() {
    setStatus('카카오톡 외부 브라우저 호출을 시도했습니다. 반응이 없으면 오른쪽 위 메뉴의 “다른 브라우저로 열기”를 사용하세요.');
    try {
      global.open(buildKakaoExternalUrl(target.href), '_blank');
    } catch (error) {}
  }

  function launchExternalBrowser(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (isAndroid) {
      setStatus('Android 기본 브라우저 선택 화면을 여는 중입니다. 열리지 않으면 카카오톡 오른쪽 위 메뉴를 사용하세요.');
      global.location.href = buildAndroidIntentUrl(target.href);
      return;
    }
    if (isIOS) {
      launchKakaoSchemeWithoutReplacingLanding();
      return;
    }
    setStatus('새 브라우저에서 FoxBear를 여는 중입니다.');
    var opened = global.open(target.href, '_blank', 'noopener,noreferrer');
    if (!opened) global.location.href = target.href;
  }

  async function copyTarget() {
    try {
      if (!navigatorRef.clipboard || typeof navigatorRef.clipboard.writeText !== 'function') throw new Error('clipboard unavailable');
      await navigatorRef.clipboard.writeText(target.href);
      setStatus('주소를 복사했습니다. 카카오톡 오른쪽 위 메뉴에서 다른 브라우저로 열거나 Chrome/Safari 주소창에 붙여넣으세요.');
    } catch (error) {
      var field = doc.createElement('textarea');
      field.value = target.href;
      field.setAttribute('readonly', '');
      field.className = 'external-browser-copy-field';
      doc.body.appendChild(field);
      field.select();
      try { doc.execCommand('copy'); } catch (copyError) {}
      if (field.parentNode) field.parentNode.removeChild(field);
      setStatus('주소를 복사했습니다. 기본 브라우저 주소창에 붙여넣으세요.');
    }
  }

  if (!isKakao) {
    global.location.replace(target.href);
    return;
  }

  if (primary) primary.addEventListener('click', launchExternalBrowser);
  if (kakaoScheme) {
    kakaoScheme.hidden = !isIOS;
    kakaoScheme.addEventListener('click', launchKakaoSchemeWithoutReplacingLanding);
  }
  if (copy) copy.addEventListener('click', copyTarget);
  if (direct) direct.href = target.href;

  if (continueInApp) {
    var bypass = new URL(target.href);
    bypass.searchParams.set('foxbearInApp', '1');
    continueInApp.href = bypass.href;
  }

  // The landing must remain visible until the user acts. Do not auto-launch a
  // custom scheme or intent from a timer; blocked scheme navigation is the main
  // cause of Kakao-only blank/error pages.
  setStatus('페이지가 정상적으로 열렸습니다. 아래 버튼을 눌러 기본 브라우저로 이동하세요.');

  global.FoxBearExternalBrowserLanding = Object.freeze({
    target: target.href,
    isKakao: isKakao,
    isAndroid: isAndroid,
    isIOS: isIOS,
    buildKakaoExternalUrl: buildKakaoExternalUrl,
    buildAndroidIntentUrl: buildAndroidIntentUrl,
    launchExternalBrowser: launchExternalBrowser,
    launchKakaoSchemeWithoutReplacingLanding: launchKakaoSchemeWithoutReplacingLanding
  });
})(typeof window !== 'undefined' ? window : globalThis);
