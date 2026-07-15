const { test, expect } = require('@playwright/test');
const { expectRuntimeHealthy, getServiceWorkerSnapshot, installWakeLockMock, navigateToApp } = require('./helpers/foxbear-e2e-helpers');

test.describe('FoxBear PWA, back navigation, wake lock, and service worker', () => {
  test.beforeEach(async ({ page }) => {
    await installWakeLockMock(page);
  });

  test('keeps app healthy after history back/forward navigation', async ({ page }) => {
    await navigateToApp(page);
    await expectRuntimeHealthy(expect, page);

    await page.evaluate(() => {
      history.pushState({ foxbearE2E: true }, '', '#foxbear-e2e-back-test');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { foxbearE2E: true } }));
    });
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
    await expectRuntimeHealthy(expect, page);
  });

  test('exposes wake lock controller and handles mocked request/release', async ({ page }) => {
    await navigateToApp(page);
    await expectRuntimeHealthy(expect, page);
    await page.waitForFunction(() => Boolean(window.FoxBearWakeLockController && window.FoxBearWakeLockController.getSnapshot));

    const requestResult = await page.evaluate(async () => {
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

  test('registers and updates service worker without runtime health failures', async ({ page }) => {
    await navigateToApp(page);
    await expectRuntimeHealthy(expect, page);

    const before = await getServiceWorkerSnapshot(page);
    expect(before.supported).toBeTruthy();
    expect(before.ready).toBeTruthy();
    expect(before.registrations).toBeGreaterThan(0);

    const updated = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      return {
        scope: registration.scope,
        activeScript: registration.active && registration.active.scriptURL,
        waitingScript: registration.waiting && registration.waiting.scriptURL
      };
    });
    expect(updated.scope).toContain('/');
    expect(updated.activeScript || updated.waitingScript || '').toContain('sw.js');
    await expectRuntimeHealthy(expect, page);
  });
});
