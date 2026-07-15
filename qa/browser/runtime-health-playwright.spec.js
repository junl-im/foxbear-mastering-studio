const { test, expect } = require('@playwright/test');
const { getReleaseMetadata } = require('../../tools/release-metadata');
const { APP_URL, expectRuntimeHealthy, navigateToApp } = require('./helpers/foxbear-e2e-helpers');

const RELEASE = getReleaseMetadata();

test.describe('FoxBear browser runtime health', () => {
  test('boots without missing globals, DOM ids, resource failures, or console errors', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const localRequestFailures = [];
    const appOrigin = new URL(APP_URL).origin;
    const isOptionalRemote = text => /firebase|firestore|googleapis|gstatic|identitytoolkit|firebaseio|remote config/i.test(String(text || ''));

    page.on('console', message => {
      if (message.type() !== 'error') return;
      const text = message.text();
      const sourceUrl = message.location()?.url || '';
      const genericNetworkNoise = /Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_|ERR_FAILED/i.test(text);
      if (!isOptionalRemote(`${sourceUrl} ${text}`) && !genericNetworkNoise) {
        consoleErrors.push(sourceUrl ? `${text} @ ${sourceUrl}` : text);
      }
    });
    page.on('pageerror', error => {
      const detail = `${error?.name || 'Error'}: ${error?.message || error}`;
      if (!isOptionalRemote(`${detail} ${error?.stack || ''}`)) pageErrors.push(detail);
    });
    page.on('requestfailed', request => {
      const url = request.url();
      let local = false;
      try { local = new URL(url).origin === appOrigin; } catch (_) {}
      if (!local) return;
      localRequestFailures.push(`${request.method()} ${url} · ${request.failure()?.errorText || 'request failed'}`);
    });

    await navigateToApp(page);
    const report = await expectRuntimeHealthy(expect, page);
    expect(report.version).toContain(RELEASE.assetVersion);
    const releasePresentation = await page.evaluate(() => window.FoxBearReleasePresentation?.getReport?.());
    expect(releasePresentation?.productVersion).toBe(RELEASE.productVersion);
    await expect(page.locator('[data-release-label="version-button"]')).toHaveText(`버전 정보 v${RELEASE.productVersion}`);
    await expect(page.locator('[data-release-label="program-eyebrow"]')).toHaveText(`FoxBear Mastering PRO v${RELEASE.productVersion}`);

    const headerSettings = await page.evaluate(() => {
      const designer = document.querySelector('.brand-right-actions .designer-mini');
      const host = document.getElementById('headerSettingsHost');
      const toggle = document.getElementById('mobileNativeQuickToggle');
      if (!designer || !host || !toggle) return null;
      const designerRect = designer.getBoundingClientRect();
      const toggleRect = toggle.getBoundingClientRect();
      return {
        hostParentClass: host.parentElement?.className || '',
        placement: toggle.parentElement?.dataset?.placement || '',
        designerRight: designerRect.right,
        toggleLeft: toggleRect.left,
        toggleRight: toggleRect.right,
        viewportWidth: window.innerWidth
      };
    });
    expect(headerSettings).not.toBeNull();
    expect(headerSettings.hostParentClass).toContain('brand-right-actions');
    expect(headerSettings.placement).toBe('header');
    expect(headerSettings.toggleLeft).toBeGreaterThanOrEqual(headerSettings.designerRight - 2);
    expect(headerSettings.toggleRight).toBeLessThanOrEqual(headerSettings.viewportWidth + 1);

    await page.locator('#mobileNativeQuickToggle').click();
    await expect(page.locator('#mobileNativePanel')).toBeVisible();
    const panelBounds = await page.locator('#mobileNativePanel').boundingBox();
    expect(panelBounds).not.toBeNull();
    expect(panelBounds.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(headerSettings.viewportWidth + 1);
    await page.locator('#mobileNativePanel [data-native-action="close"]').click();

    expect(localRequestFailures, `localRequestFailures · ${JSON.stringify(localRequestFailures)}`).toEqual([]);
    expect(pageErrors, `pageErrors · ${JSON.stringify(pageErrors)}`).toEqual([]);
    expect(consoleErrors, `consoleErrors · ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });
});
