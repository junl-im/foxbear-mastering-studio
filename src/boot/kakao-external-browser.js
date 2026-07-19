// FoxBear lightweight external-browser launcher for KakaoTalk in-app browser.
'use strict';

(function initKakaoExternalBrowserLanding(global) {
  const doc = global.document;
  if (!doc) return;

  const ua = String(global.navigator?.userAgent || '');
  const isKakao = /KAKAOTALK|KakaoTalk/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const params = new URL(global.location.href).searchParams;
  const fallbackTarget = new URL('./index.html?foxbearExternal=1', global.location.href);

  function resolveTarget() {
    const raw = params.get('target');
    if (!raw) return fallbackTarget;
    try {
      const parsed = new URL(raw, global.location.href);
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

  const target = resolveTarget();
  const status = doc.getElementById('externalBrowserStatus');
  const primary = doc.getElementById('openExternalBrowser');
  const androidFallback = doc.getElementById('openAndroidBrowser');
  const copy = doc.getElementById('copyExternalUrl');
  const continueInApp = doc.getElementById('continueInKakao');

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function buildKakaoExternalUrl(url) {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  }

  function buildAndroidIntentUrl(url) {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(':', '') || 'https';
    const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    const fallback = encodeURIComponent(parsed.href);
    return `intent://${path}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${fallback};end`;
  }

  function launchWithKakaoScheme() {
    setStatus('기본 브라우저를 여는 중입니다. 전환되지 않으면 아래 Android 대체 버튼이나 주소 복사를 사용하세요.');
    global.location.href = buildKakaoExternalUrl(target.href);
  }

  function launchAndroidIntent() {
    setStatus('Android 기본 브라우저 선택 화면을 여는 중입니다.');
    global.location.href = buildAndroidIntentUrl(target.href);
  }

  async function copyTarget() {
    try {
      await global.navigator.clipboard.writeText(target.href);
      setStatus('주소를 복사했습니다. 카카오톡 오른쪽 위 메뉴에서 다른 브라우저로 열거나 Chrome/Safari 주소창에 붙여넣으세요.');
    } catch (error) {
      const field = doc.createElement('textarea');
      field.value = target.href;
      field.setAttribute('readonly', '');
      field.className = 'external-browser-copy-field';
      doc.body.appendChild(field);
      field.select();
      try { doc.execCommand('copy'); } catch (copyError) {}
      field.remove();
      setStatus('주소를 복사했습니다. 기본 브라우저 주소창에 붙여넣으세요.');
    }
  }

  if (!isKakao) {
    global.location.replace(target.href);
    return;
  }

  primary?.addEventListener('click', launchWithKakaoScheme);
  if (androidFallback) {
    androidFallback.hidden = !isAndroid;
    androidFallback.addEventListener('click', launchAndroidIntent);
  }
  copy?.addEventListener('click', copyTarget);

  if (continueInApp) {
    const bypass = new URL(target.href);
    bypass.searchParams.set('foxbearInApp', '1');
    continueInApp.href = bypass.href;
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') setStatus('기본 브라우저로 전환했습니다.');
  });

  try {
    const attemptKey = `foxbear-kakao-external-attempt:${target.pathname}`;
    const lastAttempt = Number(global.sessionStorage.getItem(attemptKey) || 0);
    const now = Date.now();
    if (!lastAttempt || now - lastAttempt > 15000) {
      global.sessionStorage.setItem(attemptKey, String(now));
      global.setTimeout(launchWithKakaoScheme, 180);
      global.setTimeout(() => {
        if (doc.visibilityState === 'visible') setStatus('자동 전환이 막혔습니다. “기본 브라우저에서 시작”을 눌러주세요.');
      }, 1400);
    } else {
      setStatus('“기본 브라우저에서 시작”을 눌러주세요.');
    }
  } catch (error) {
    setStatus('“기본 브라우저에서 시작”을 눌러주세요.');
  }

  global.FoxBearExternalBrowserLanding = Object.freeze({
    target: target.href,
    isKakao,
    isAndroid,
    buildKakaoExternalUrl,
    buildAndroidIntentUrl,
    launchWithKakaoScheme,
    launchAndroidIntent
  });
})(typeof window !== 'undefined' ? window : globalThis);
