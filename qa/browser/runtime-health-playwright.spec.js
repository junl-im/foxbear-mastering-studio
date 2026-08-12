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
    await expect(page.locator('[data-release-label="version-button"]')).toHaveText(`v${RELEASE.productVersion}`);
    await expect(page.locator('[data-release-label="program-eyebrow"]')).toHaveText(`FoxBear Mastering PRO v${RELEASE.productVersion}`);

    const headerSettings = await page.evaluate(() => {
      const topLine = document.querySelector('.brand-command-bar');
      const kicker = document.querySelector('.brand-command-left');
      const build = document.querySelector('.brand-command-build');
      const device = document.querySelector('.brand-command-device');
      const deviceIcons = device?.querySelector('.brand-command-device-icons');
      const screenIcon = deviceIcons?.querySelector('.is-screen');
      const phoneIcon = deviceIcons?.querySelector('.is-phone');
      const studio = document.querySelector('.brand-command-studio');
      const designer = document.querySelector('.brand-right-actions .designer-mini');
      const actions = document.querySelector('.brand-right-actions');
      const modeSwitch = document.getElementById('uiModeSwitchBtn');
      const host = document.getElementById('headerSettingsHost');
      const toggle = document.getElementById('mobileNativeQuickToggle');
      if (!topLine || !kicker || !build || !device || !deviceIcons || !screenIcon || !phoneIcon || !studio || !designer || !actions || !modeSwitch || !host || !toggle) return null;
      const rect = node => node.getBoundingClientRect();
      const topLineRect = rect(topLine);
      const kickerRect = rect(kicker);
      const buildRect = rect(build);
      const deviceRect = rect(device);
      const deviceIconsRect = rect(deviceIcons);
      const screenIconRect = rect(screenIcon);
      const phoneIconRect = rect(phoneIcon);
      const studioRect = rect(studio);
      const actionsRect = rect(actions);
      const designerRect = rect(designer);
      const modeSwitchRect = rect(modeSwitch);
      const toggleRect = rect(toggle);
      const topLineStyle = getComputedStyle(topLine);
      const designerStyle = getComputedStyle(designer);
      const buildStyle = getComputedStyle(build);
      const deviceIconsStyle = getComputedStyle(deviceIcons);
      const toggleStyle = getComputedStyle(toggle);
      const afterStyle = getComputedStyle(toggle, '::after');
      const centers = [buildRect, deviceRect, studioRect, designerRect, modeSwitchRect, toggleRect]
        .filter(box => box.width > 0 && box.height > 0)
        .map(box => (box.top + box.bottom) / 2);
      return {
        hostParentClass: host.parentElement?.className || '',
        placement: toggle.parentElement?.dataset?.placement || '',
        buildText: build.textContent.replace(/\s+/g, ' ').trim(),
        deviceText: device.textContent.replace(/\s+/g, ' ').trim(),
        studioText: studio.textContent.trim(),
        designerText: designer.textContent.replace(/\s+/g, ' ').trim(),
        toggleText: toggle.textContent.trim(),
        toggleAfter: afterStyle.content,
        buildRight: buildRect.right,
        deviceLeft: deviceRect.left,
        deviceRight: deviceRect.right,
        deviceIconsWidth: deviceIconsRect.width,
        deviceIconsHeight: deviceIconsRect.height,
        screenIconWidth: screenIconRect.width,
        phoneIconWidth: phoneIconRect.width,
        deviceIconsDisplay: deviceIconsStyle.display,
        studioLeft: studioRect.left,
        studioRight: studioRect.right,
        studioDisplay: getComputedStyle(studio).display,
        actionsLeft: actionsRect.left,
        designerRight: designerRect.right,
        modeSwitchLeft: modeSwitchRect.left,
        modeSwitchRight: modeSwitchRect.right,
        modeSwitchWidth: modeSwitchRect.width,
        modeSwitchHeight: modeSwitchRect.height,
        toggleLeft: toggleRect.left,
        toggleRight: toggleRect.right,
        toggleWidth: toggleRect.width,
        viewportWidth: window.innerWidth,
        compact: window.innerWidth <= 720,
        headerContract: getComputedStyle(document.documentElement).getPropertyValue('--foxbear-header-contract').trim(),
        topDisplay: topLineStyle.display,
        leftFlex: getComputedStyle(kicker).flex,
        actionsFlex: getComputedStyle(actions).flex,
        topLineHeight: topLineRect.height,
        topLineBorderBottom: topLineStyle.borderBottomWidth,
        centerSpread: Math.max(...centers) - Math.min(...centers),
        kickerOverflow: Math.max(0, kicker.scrollWidth - kicker.clientWidth),
        rowOverlap: Math.max(0, kickerRect.right - actionsRect.left),
        studioVisibleWidth: studioRect.width,
        designerBorder: [designerStyle.borderTopWidth, designerStyle.borderRightWidth, designerStyle.borderBottomWidth, designerStyle.borderLeftWidth],
        designerBackground: designerStyle.backgroundColor,
        buildBackground: buildStyle.backgroundColor,
        designerWhiteSpace: designerStyle.whiteSpace,
        toggleBackground: toggleStyle.backgroundColor
      };
    });
    expect(headerSettings).not.toBeNull();
    expect(headerSettings.headerContract, `header CSS contract missing/stale · ${JSON.stringify(headerSettings)}`).toBe('flex-two-rail-v1690');
    expect(headerSettings.hostParentClass).toContain('brand-right-actions');
    expect(headerSettings.placement).toBe('header');
    expect(headerSettings.buildText).toBe(`BUILD v${RELEASE.productVersion}`);
    expect(headerSettings.deviceText).toBe('모바일 · PC 호환');
    expect(['flex', 'inline-flex']).toContain(headerSettings.deviceIconsDisplay);
    expect(headerSettings.deviceIconsWidth).toBeGreaterThan(8);
    expect(headerSettings.deviceIconsHeight).toBeGreaterThan(5);
    expect(headerSettings.screenIconWidth).toBeGreaterThan(5);
    expect(headerSettings.phoneIconWidth).toBeGreaterThan(2);
    expect(headerSettings.studioText).toBe('AI MUSIC MASTERING STUDIO');
    expect(headerSettings.designerText).toBe('DESIGNED BY 곰같은여우');
    expect(headerSettings.toggleText).toBe('⚙');
    expect(['none', 'normal', '""']).toContain(headerSettings.toggleAfter);
    expect(headerSettings.buildRight).toBeLessThanOrEqual(headerSettings.deviceLeft + 1);
    expect(headerSettings.deviceRight).toBeLessThanOrEqual(headerSettings.studioLeft + 1);
    expect(headerSettings.studioRight).toBeLessThanOrEqual(headerSettings.actionsLeft + 1);
    expect(headerSettings.modeSwitchLeft).toBeGreaterThanOrEqual(headerSettings.designerRight - 2);
    expect(headerSettings.toggleLeft).toBeGreaterThanOrEqual(headerSettings.modeSwitchRight - 2);
    expect(headerSettings.toggleRight).toBeLessThanOrEqual(headerSettings.viewportWidth + 1);
    expect(headerSettings.toggleWidth).toBeLessThanOrEqual(30);
    expect(headerSettings.modeSwitchWidth).toBeGreaterThan(48);
    expect(headerSettings.modeSwitchHeight).toBeLessThanOrEqual(42);
    expect(headerSettings.topLineHeight).toBeLessThanOrEqual(42);
    expect(headerSettings.topLineBorderBottom).toBe('0px');
    expect(headerSettings.centerSpread).toBeLessThanOrEqual(8);
    expect(headerSettings.kickerOverflow).toBeLessThanOrEqual(2);
    if (headerSettings.rowOverlap > 1) {
      throw new Error(`FOXBEAR_HEADER_OVERLAP_INITIAL ${JSON.stringify(headerSettings)}`);
    }
    expect(headerSettings.rowOverlap, `initial header overlap · viewport=${headerSettings.viewportWidth} left/action collision=${headerSettings.rowOverlap}px`).toBeLessThanOrEqual(1);
    if (headerSettings.viewportWidth <= 430) {
      expect(headerSettings.studioDisplay).toBe('none');
      expect(headerSettings.studioVisibleWidth).toBe(0);
    } else {
      expect(headerSettings.studioVisibleWidth).toBeGreaterThan(12);
    }
    expect(headerSettings.designerBorder).toEqual(['0px', '0px', '0px', '0px']);
    expect(headerSettings.designerBackground).toBe('rgba(0, 0, 0, 0)');
    expect(headerSettings.buildBackground).toBe('rgba(0, 0, 0, 0)');
    expect(headerSettings.designerWhiteSpace).toBe('nowrap');
    await page.locator('#mobileNativeQuickToggle').click();
    await expect(page.locator('#mobileNativePanel')).toBeVisible();
    const panelBounds = await page.locator('#mobileNativePanel').boundingBox();
    expect(panelBounds).not.toBeNull();
    expect(panelBounds.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(headerSettings.viewportWidth + 1);
    await page.locator('#mobileNativePanel [data-native-action="close"]').click();

    await page.setViewportSize({ width: 320, height: 700 });
    await page.waitForTimeout(120);
    const narrowHeader = await page.evaluate(() => {
      const left = document.querySelector('.brand-command-left');
      const actions = document.querySelector('.brand-right-actions');
      const studio = document.querySelector('.brand-command-studio');
      const icons = document.querySelector('.brand-command-device-icons');
      const toggle = document.getElementById('mobileNativeQuickToggle');
      if (!left || !actions || !studio || !icons || !toggle) return null;
      const leftRect = left.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      const iconsRect = icons.getBoundingClientRect();
      const toggleRect = toggle.getBoundingClientRect();
      return {
        rowOverlap: Math.max(0, leftRect.right - actionsRect.left),
        leftOverflow: Math.max(0, left.scrollWidth - left.clientWidth),
        studioDisplay: getComputedStyle(studio).display,
        iconsWidth: iconsRect.width,
        toggleRight: toggleRect.right,
        viewportWidth: innerWidth,
        headerContract: getComputedStyle(document.documentElement).getPropertyValue('--foxbear-header-contract').trim(),
        leftRect: { left: leftRect.left, right: leftRect.right, width: leftRect.width },
        actionsRect: { left: actionsRect.left, right: actionsRect.right, width: actionsRect.width },
        topDisplay: getComputedStyle(document.querySelector('.brand-command-bar')).display,
        leftFlex: getComputedStyle(left).flex,
        actionsFlex: getComputedStyle(actions).flex
      };
    });
    expect(narrowHeader).not.toBeNull();
    expect(narrowHeader.headerContract, `320px header CSS contract missing/stale · ${JSON.stringify(narrowHeader)}`).toBe('flex-two-rail-v1690');
    if (narrowHeader.rowOverlap > 1) {
      throw new Error(`FOXBEAR_HEADER_OVERLAP_320 ${JSON.stringify(narrowHeader)}`);
    }
    expect(narrowHeader.rowOverlap, `320px header overlap · viewport=${narrowHeader.viewportWidth} left/action collision=${narrowHeader.rowOverlap}px`).toBeLessThanOrEqual(1);
    expect(narrowHeader.leftOverflow).toBeLessThanOrEqual(2);
    expect(narrowHeader.studioDisplay).toBe('none');
    expect(narrowHeader.iconsWidth).toBeGreaterThan(8);
    expect(narrowHeader.toggleRight).toBeLessThanOrEqual(narrowHeader.viewportWidth + 1);

    expect(localRequestFailures, `localRequestFailures · ${JSON.stringify(localRequestFailures)}`).toEqual([]);
    expect(pageErrors, `pageErrors · ${JSON.stringify(pageErrors)}`).toEqual([]);
    expect(consoleErrors, `consoleErrors · ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });
});
