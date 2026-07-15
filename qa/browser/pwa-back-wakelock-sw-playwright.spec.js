const { test, expect } = require('@playwright/test');
const { expectRuntimeHealthy, installWakeLockMock, navigateToApp, waitForServiceWorkerReady, warmServiceWorkerCache } = require('./helpers/foxbear-e2e-helpers');

test.describe('FoxBear PWA, back navigation, wake lock, and service worker', () => {
  test.beforeEach(async ({ page }) => {
    await installWakeLockMock(page);
  });

  test('keeps app healthy after history back/forward navigation', async ({ page }) => {
    await navigateToApp(page);
    await expectRuntimeHealthy(expect, page);

    const baseUrl = page.url().split('#')[0];
    await page.evaluate(() => {
      history.pushState({ foxbearE2E: true }, '', '#foxbear-e2e-back-test');
    });
    await expect(page).toHaveURL(/#foxbear-e2e-back-test$/);

    await page.goBack({ timeout: 15000 });
    await expect(page).toHaveURL(baseUrl);
    await expectRuntimeHealthy(expect, page);

    await page.goForward({ timeout: 15000 });
    await expect(page).toHaveURL(/#foxbear-e2e-back-test$/);
    await expectRuntimeHealthy(expect, page);
  });

  test('exposes wake lock controller and handles mocked request/release', async ({ page }) => {
    await navigateToApp(page);
    await expectRuntimeHealthy(expect, page);
    await page.waitForFunction(() => Boolean(window.FoxBearWakeLockController && window.FoxBearWakeLockController.getSnapshot));

    const requestResult = await page.evaluate(async () => {
      await window.FoxBearWakeLockController.release({ clearDesired: true, persist: false, reason: 'playwright-reset' });
      window.__foxbearWakeLockRequests = 0;
      window.__foxbearWakeLockLastType = '';
      await window.FoxBearWakeLockController.request('playwright-manual', { toast: false });
      const active = window.FoxBearWakeLockController.getSnapshot();
      await window.FoxBearWakeLockController.release({ clearDesired: true, reason: 'playwright-release' });
      const released = window.FoxBearWakeLockController.getSnapshot();
      return { active, released, requestCount: window.__foxbearWakeLockRequests || 0, lastType: window.__foxbearWakeLockLastType || '' };
    });

    expect(requestResult.requestCount).toBeGreaterThan(0);
    expect(requestResult.lastType).toBe('screen');
    expect(requestResult.active.supported).toBeTruthy();
    expect(requestResult.active.active).toBeTruthy();
    expect(requestResult.released.active).toBeFalsy();
  });

  test('registers, warms, and updates service worker without runtime health failures', async ({ page }, testInfo) => {
    await navigateToApp(page);
    await expectRuntimeHealthy(expect, page);

    const before = await waitForServiceWorkerReady(page);
    expect(before.supported).toBeTruthy();
    expect(before.ready).toBeTruthy();
    expect(before.registrations).toBeGreaterThan(0);

    if (testInfo.project.name === 'chromium-desktop') {
      const warmed = await warmServiceWorkerCache(page);
      expect(warmed.failed, JSON.stringify(warmed.failures || [])).toBe(0);
      expect(warmed.total).toBeGreaterThan(0);
      expect((warmed.cached || 0) + (warmed.alreadyCached || 0)).toBe(warmed.total);

      const repeated = await warmServiceWorkerCache(page);
      expect(repeated.failed, JSON.stringify(repeated.failures || [])).toBe(0);
      expect(repeated.cached).toBe(0);
      expect(repeated.alreadyCached).toBe(repeated.total);
    }

    const updated = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const registration = registrations.find(item => item.active || item.waiting || item.installing) || registrations[0];
      if (!registration) throw new Error('service-worker-registration-missing');
      await registration.update();
      return {
        scope: registration.scope,
        activeScript: registration.active && registration.active.scriptURL,
        waitingScript: registration.waiting && registration.waiting.scriptURL,
        installingScript: registration.installing && registration.installing.scriptURL
      };
    });
    expect(updated.scope).toContain('/');
    expect(updated.activeScript || updated.waitingScript || updated.installingScript || '').toContain('sw.js');
    await expectRuntimeHealthy(expect, page);
  });
});
