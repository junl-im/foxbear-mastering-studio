// FoxBear KakaoTalk entry notice: centered, non-blocking download compatibility guidance.
'use strict';

(function initializeKakaoEntryNotice(global) {
  var documentRef = global.document;
  var navigatorRef = global.navigator || {};
  var entry = global.FoxBearKakaoEntry || null;
  var userAgent = String(navigatorRef.userAgent || '');
  var isKakao = Boolean(entry && entry.restricted) || /KAKAOTALK|KakaoTalk/i.test(userAgent);
  var AUTO_DISMISS_MS = 8000;
  var REMOVE_DELAY_MS = 420;
  var layer = null;
  var dismissTimer = 0;
  var removeTimer = 0;
  var dismissEventName = 'PointerEvent' in global ? 'pointerdown' : 'touchstart';
  var dismissed = false;
  var shown = false;
  var dismissReason = '';

  function isStandaloneMode() {
    if (navigatorRef.standalone === true) return true;
    try {
      return Boolean(global.matchMedia && global.matchMedia('(display-mode: standalone)').matches);
    } catch (error) {
      return false;
    }
  }

  function shouldShow() {
    if (!documentRef || !isKakao || isStandaloneMode()) return false;
    if (entry && entry.mode === 'external-guide') return false;
    return true;
  }

  function removeGlobalListeners() {
    if (!documentRef || !documentRef.removeEventListener) return;
    documentRef.removeEventListener(dismissEventName, handleScreenTouch, true);
    documentRef.removeEventListener('keydown', handleKeyDown, true);
  }

  function finalizeRemoval() {
    if (!layer) return;
    var current = layer;
    layer = null;
    if (current.parentNode) current.parentNode.removeChild(current);
  }

  function dismiss(reason) {
    if (!layer || dismissed) return false;
    dismissed = true;
    dismissReason = String(reason || 'dismissed');
    global.clearTimeout(dismissTimer);
    global.clearTimeout(removeTimer);
    removeGlobalListeners();
    layer.classList.remove('is-visible');
    layer.classList.add('is-leaving');
    layer.setAttribute('aria-hidden', 'true');
    removeTimer = global.setTimeout(finalizeRemoval, REMOVE_DELAY_MS);
    return true;
  }

  function handleScreenTouch() {
    dismiss('screen-touch');
  }

  function handleKeyDown(event) {
    if (event && event.key === 'Escape') dismiss('escape-key');
  }

  function createTextNode(tagName, className, text) {
    var node = documentRef.createElement(tagName);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function createNotice() {
    var noticeLayer = documentRef.createElement('div');
    noticeLayer.id = 'foxbearKakaoEntryNotice';
    noticeLayer.className = 'foxbear-kakao-entry-notice';
    noticeLayer.setAttribute('role', 'status');
    noticeLayer.setAttribute('aria-live', 'assertive');
    noticeLayer.setAttribute('aria-atomic', 'true');
    noticeLayer.setAttribute('aria-label', '카카오 브라우저 다운로드 안내');

    var card = documentRef.createElement('section');
    card.className = 'foxbear-kakao-entry-notice-card';
    card.setAttribute('aria-labelledby', 'foxbearKakaoEntryNoticeTitle');

    var badge = createTextNode('div', 'foxbear-kakao-entry-notice-badge', 'KAKAO IN-APP BROWSER');
    var title = createTextNode('h2', 'foxbear-kakao-entry-notice-title', '카카오 브라우저 이용 안내');
    title.id = 'foxbearKakaoEntryNoticeTitle';
    var warning = createTextNode(
      'p',
      'foxbear-kakao-entry-notice-warning',
      '카카오 브라우저에서는 마스터링된 파일 다운로드가 원활하지 않을 수 있습니다.'
    );
    var browserGuide = createTextNode(
      'p',
      'foxbear-kakao-entry-notice-guide',
      '오른쪽 위 메뉴에서 “다른 브라우저로 열기”를 선택한 뒤 Chrome, Safari 또는 기본 브라우저에서 사용해주세요.'
    );
    var pwaGuide = createTextNode(
      'p',
      'foxbear-kakao-entry-notice-pwa',
      '또는 FoxBear를 홈 화면에 설치(PWA)하면 앱처럼 더 안정적으로 사용할 수 있습니다.'
    );
    var footer = createTextNode(
      'div',
      'foxbear-kakao-entry-notice-footer',
      '화면을 터치하면 닫힙니다 · 8초 후 자동으로 사라집니다'
    );
    var timerTrack = documentRef.createElement('div');
    timerTrack.className = 'foxbear-kakao-entry-notice-timer';
    timerTrack.setAttribute('aria-hidden', 'true');

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(warning);
    card.appendChild(browserGuide);
    card.appendChild(pwaGuide);
    card.appendChild(footer);
    card.appendChild(timerTrack);
    noticeLayer.appendChild(card);
    return noticeLayer;
  }

  function show() {
    if (!shouldShow() || shown || layer) return false;
    var parent = documentRef.body || documentRef.documentElement;
    if (!parent) return false;

    shown = true;
    dismissed = false;
    dismissReason = '';
    layer = createNotice();
    parent.appendChild(layer);
    documentRef.addEventListener(dismissEventName, handleScreenTouch, true);
    documentRef.addEventListener('keydown', handleKeyDown, true);

    var reveal = function revealNotice() {
      if (layer && !dismissed) layer.classList.add('is-visible');
    };
    if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(reveal);
    else global.setTimeout(reveal, 16);

    dismissTimer = global.setTimeout(function autoDismissNotice() {
      dismiss('auto-timeout');
    }, AUTO_DISMISS_MS);
    return true;
  }

  global.FoxBearKakaoEntryNotice = Object.freeze({
    show: show,
    dismiss: dismiss,
    shouldShow: shouldShow,
    autoDismissMs: AUTO_DISMISS_MS,
    get active() { return Boolean(layer && !dismissed); },
    get shown() { return shown; },
    get dismissReason() { return dismissReason; }
  });

  if (!shouldShow()) return;
  if (documentRef.readyState === 'loading') documentRef.addEventListener('DOMContentLoaded', show, { once: true });
  else show();
})(typeof window !== 'undefined' ? window : globalThis);
