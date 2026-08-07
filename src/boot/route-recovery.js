// FoxBear route recovery bootstrap.
'use strict';

(function recoverFoxBearRoute() {
  const status = document.getElementById('status');
  const link = document.getElementById('rootLink');
  const isKakao = /KAKAOTALK|KakaoTalk/i.test(String(navigator.userAgent || ''));

  if (!status || !link) return;
  if (isKakao) {
    status.textContent = '카카오 브라우저가 작업 중 페이지를 다시 불러왔습니다. 음원 오류가 아니라 WebView 메모리 또는 경로 복구일 수 있습니다.';
  }

  function candidates() {
    const parts = location.pathname.split('/').filter(Boolean);
    const output = [];
    for (let index = parts.length; index >= 0; index -= 1) {
      output.push(`/${parts.slice(0, index).join('/')}${index ? '/' : ''}`);
    }
    if (/\.github\.io$/i.test(location.hostname) && parts.length) {
      const project = `/${parts[0]}/`;
      if (!output.includes(project)) output.unshift(project);
    }
    return output.filter((value, index, values) => values.indexOf(value) === index);
  }

  async function findRoot() {
    for (const candidate of candidates()) {
      try {
        const marker = new URL(`${candidate}foxbear-root.json`, location.origin);
        marker.searchParams.set('t', Date.now());
        const response = await fetch(marker.href, { cache: 'no-store', redirect: 'follow' });
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.foxbearAppRoot === true) return candidate;
      } catch (error) {
        console.warn('[FoxBear] route marker probe failed:', error?.message || error);
      }
    }
    if (/\.github\.io$/i.test(location.hostname)) {
      const parts = location.pathname.split('/').filter(Boolean);
      if (parts.length) return `/${parts[0]}/`;
    }
    return '/';
  }

  async function clearOldRuntime() {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names
          .filter(name => /^(foxbear-|workbox-|precache-)/i.test(name))
          .map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        try {
          navigator.serviceWorker.controller?.postMessage({ type: 'FOXBEAR_PURGE_CACHES' });
        } catch (error) {
          console.warn('[FoxBear] service worker purge notification failed:', error?.message || error);
        }
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister().catch(() => false)));
      }
      try {
        sessionStorage.setItem('foxbearBypassSwOnce', '1');
      } catch (error) {
        console.warn('[FoxBear] route recovery session marker unavailable:', error?.message || error);
      }
    } catch (error) {
      console.warn('[FoxBear] route recovery cleanup failed:', error?.message || error);
    }
  }

  (async () => {
    const base = await findRoot();
    const target = new URL(`${base}index.html`, location.origin);
    target.searchParams.set('foxbearRouteRecovery', '1');
    if (isKakao) {
      target.searchParams.set('foxbearInApp', '1');
      target.searchParams.delete('foxbearExternal');
      target.searchParams.delete('foxbearGuide');
    }
    target.searchParams.set('foxbearReload', String(Date.now()));
    link.href = target.href;
    await clearOldRuntime();
    status.textContent = isKakao
      ? '복구가 완료되었습니다. 카카오톡 안의 FoxBear 작업 화면으로 이동합니다.'
      : '복구가 완료되어 작업 화면으로 이동합니다.';
    if (location.href !== target.href) {
      try {
        location.replace(target.href);
      } catch (error) {
        console.warn('[FoxBear] route replace failed; using href fallback:', error?.message || error);
        location.href = target.href;
      }
    }
  })().catch(error => {
    console.error('[FoxBear] route recovery failed:', error);
    status.textContent = '자동 복구에 실패했습니다. 아래 링크로 작업 화면을 다시 열어주세요.';
  });
})();
