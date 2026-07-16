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
    const optionalRemoteHost = hostname => /(^|\.)(?:gstatic\.com|googleapis\.com|firebaseio\.com|firebaseapp\.com|googleusercontent\.com)$/.test(String(hostname || '').toLowerCase());
    const isOptionalRemoteUrl = value => {
      try { return optionalRemoteHost(new URL(String(value || '')).hostname); } catch (_) { return false; }
    };
    const isOptionalRemote = (sourceUrl, text = '') => {
      if (isOptionalRemoteUrl(sourceUrl)) return true;
      const urls = String(text || '').match(/https?:\/\/[^\s"'<>]+/g) || [];
      return urls.some(isOptionalRemoteUrl);
    };

    page.on('console', message => {
      if (message.type() !== 'error') return;
      const text = message.text();
      const sourceUrl = message.location()?.url || '';
      const genericNetworkNoise = /Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_|ERR_FAILED/i.test(text);
      if (isOptionalRemote(sourceUrl, text) && genericNetworkNoise) return;
      consoleErrors.push(sourceUrl ? `${text} @ ${sourceUrl}` : text);
    });
    page.on('pageerror', error => {
      const detail = `${error?.name || 'Error'}: ${error?.message || error}`;
      if (!isOptionalRemote('', error?.stack || detail)) pageErrors.push(detail);
    });
    page.on('requestfailed', request => {
      const url = request.url();
      let local = false;
      try { local = new URL(url).origin === appOrigin; } catch (_) {}
      if (!local) return;
      localRequestFailures.push(`${request.method()} ${url} · ${request.failure()?.errorText || 'request failed'}`);
    });
    page.on('response', response => {
      const url = response.url();
      let local = false;
      try { local = new URL(url).origin === appOrigin; } catch (_) {}
      if (local && response.status() >= 400) localRequestFailures.push(`HTTP ${response.status()} ${url}`);
    });

    await navigateToApp(page);
    const report = await expectRuntimeHealthy(expect, page);
    expect(report.version).toContain(RELEASE.assetVersion);
    const releasePresentation = await page.evaluate(() => window.FoxBearReleasePresentation?.getReport?.());
    expect(releasePresentation?.productVersion).toBe(RELEASE.productVersion);
    await expect(page.locator('[data-release-label="version-button"]')).toHaveText(`버전 정보 v${RELEASE.productVersion}`);
    await expect(page.locator('[data-release-label="program-eyebrow"]')).toHaveText(`FoxBear Mastering PRO v${RELEASE.productVersion}`);

    const headerSettings = await page.evaluate(() => {
      const topLine = document.querySelector('.brand-topline');
      const kicker = document.querySelector('.brand-topline .brand-kicker');
      const badges = Array.from(kicker?.querySelectorAll('.badge') || []);
      const designer = document.querySelector('.brand-right-actions .designer-mini');
      const host = document.getElementById('headerSettingsHost');
      const toggle = document.getElementById('mobileNativeQuickToggle');
      if (!topLine || !kicker || badges.length < 2 || !designer || !host || !toggle) return null;
      const topLineRect = topLine.getBoundingClientRect();
      const kickerRect = kicker.getBoundingClientRect();
      const designerRect = designer.getBoundingClientRect();
      const toggleRect = toggle.getBoundingClientRect();
      const designerStyle = getComputedStyle(designer);
      const centers = [kickerRect, designerRect, toggleRect].map(rect => (rect.top + rect.bottom) / 2);
      return {
        hostParentClass: host.parentElement?.className || '',
        placement: toggle.parentElement?.dataset?.placement || '',
        designerRight: designerRect.right,
        toggleLeft: toggleRect.left,
        toggleRight: toggleRect.right,
        viewportWidth: window.innerWidth,
        compact: window.innerWidth <= 720,
        topLineHeight: topLineRect.height,
        centerSpread: Math.max(...centers) - Math.min(...centers),
        kickerOverflow: Math.max(0, kicker.scrollWidth - kicker.clientWidth),
        badgeTopSpread: Math.max(...badges.map(node => node.getBoundingClientRect().top)) - Math.min(...badges.map(node => node.getBoundingClientRect().top)),
        designerBorder: [designerStyle.borderTopWidth, designerStyle.borderRightWidth, designerStyle.borderBottomWidth, designerStyle.borderLeftWidth],
        designerBackground: designerStyle.backgroundColor,
        designerWhiteSpace: designerStyle.whiteSpace
      };
    });
    expect(headerSettings).not.toBeNull();
    expect(headerSettings.hostParentClass).toContain('brand-right-actions');
    expect(headerSettings.placement).toBe('header');
    expect(headerSettings.toggleLeft).toBeGreaterThanOrEqual(headerSettings.designerRight - 2);
    expect(headerSettings.toggleRight).toBeLessThanOrEqual(headerSettings.viewportWidth + 1);
    expect(headerSettings.topLineHeight).toBeLessThanOrEqual(headerSettings.compact ? 40 : 44);
    expect(headerSettings.centerSpread).toBeLessThanOrEqual(8);
    expect(headerSettings.kickerOverflow).toBeLessThanOrEqual(2);
    expect(headerSettings.badgeTopSpread).toBeLessThanOrEqual(2);
    expect(headerSettings.designerBorder).toEqual(['0px', '0px', '0px', '0px']);
    expect(headerSettings.designerBackground).toBe('rgba(0, 0, 0, 0)');
    expect(headerSettings.designerWhiteSpace).toBe('nowrap');

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
