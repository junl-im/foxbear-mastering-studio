// FoxBear service-worker recovery lifecycle - v1.6.73
(function attachFoxBearServiceWorkerRecoveryService(global) {
  'use strict';

  const BYPASS_KEY = 'foxbearBypassSwOnce';

  function takeOneShotBypass() {
    try {
      const active = global.sessionStorage?.getItem?.(BYPASS_KEY) === '1';
      if (active) global.sessionStorage.removeItem(BYPASS_KEY);
      return active;
    } catch (error) {
      return false;
    }
  }

  async function consumeOneShotBypass() {
    if (!takeOneShotBypass()) return false;
    try {
      global.navigator?.serviceWorker?.controller?.postMessage?.({ type: 'FOXBEAR_PURGE_CACHES' });
      if ('caches' in global) {
        const names = await global.caches.keys();
        await Promise.all(names.filter(name => /^(foxbear-|workbox-|precache-)/i.test(name)).map(name => global.caches.delete(name)));
      }
      const registrations = await global.navigator?.serviceWorker?.getRegistrations?.() || [];
      await Promise.all(registrations.map(registration => registration.unregister().catch(() => false)));
    } catch (error) {
      console.warn('[FoxBear] service-worker recovery cleanup skipped', error);
    }
    return true;
  }

  global.FoxBearServiceWorkerRecoveryService = Object.freeze({
    takeOneShotBypass,
    consumeOneShotBypass
  });
})(window);
