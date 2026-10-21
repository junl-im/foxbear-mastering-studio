const { test, expect } = require('@playwright/test');
const { getReleaseMetadata } = require('../../tools/release-metadata');
const { APP_URL, UI_MODE_SESSION_KEY, expectRuntimeHealthy, installOptionalRemoteMocks, navigateToApp } = require('./helpers/foxbear-e2e-helpers');

const RELEASE = getReleaseMetadata();
const CSS_LAYOUT_QUANTUM_PX = 1 / 64;
const HEADER_CENTER_SPREAD_LIMIT_PX = 8;

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
      const centerPositions = Object.fromEntries([
        ['build', buildRect],
        ['device', deviceRect],
        ['studio', studioRect],
        ['designer', designerRect],
        ['modeSwitch', modeSwitchRect],
        ['settingsToggle', toggleRect]
      ]
        .filter(([, box]) => box.width > 0 && box.height > 0)
        .map(([name, box]) => [name, (box.top + box.bottom) / 2]));
      const centers = Object.values(centerPositions);
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
        centerPositions,
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
    expect(headerSettings.buildRight, `header order build→device · buildRight=${headerSettings.buildRight} deviceLeft=${headerSettings.deviceLeft}`).toBeLessThanOrEqual(headerSettings.deviceLeft + 1);
    const studioIsVisible = headerSettings.studioDisplay !== 'none' && headerSettings.studioVisibleWidth > 0;
    if (studioIsVisible) {
      expect(headerSettings.deviceRight, `header order device→studio · deviceRight=${headerSettings.deviceRight} studioLeft=${headerSettings.studioLeft}`).toBeLessThanOrEqual(headerSettings.studioLeft + 1);
      expect(headerSettings.studioRight, `header order studio→actions · studioRight=${headerSettings.studioRight} actionsLeft=${headerSettings.actionsLeft}`).toBeLessThanOrEqual(headerSettings.actionsLeft + 1);
    } else {
      // Hidden elements report a zero DOMRect. Comparing deviceRight against
      // hidden studioLeft would turn a healthy compact header into an
      // artificial `Expected <= 1` failure. Compare the last visible token
      // against the right action rail instead.
      expect(headerSettings.deviceRight, `compact header visible rail device→actions · deviceRight=${headerSettings.deviceRight} actionsLeft=${headerSettings.actionsLeft}`).toBeLessThanOrEqual(headerSettings.actionsLeft + 1);
    }
    expect(headerSettings.modeSwitchLeft).toBeGreaterThanOrEqual(headerSettings.designerRight - 2);
    expect(headerSettings.toggleLeft).toBeGreaterThanOrEqual(headerSettings.modeSwitchRight - 2);
    expect(headerSettings.toggleRight).toBeLessThanOrEqual(headerSettings.viewportWidth + 1);
    expect(headerSettings.toggleWidth).toBeLessThanOrEqual(30);
    expect(headerSettings.modeSwitchWidth).toBeGreaterThan(48);
    expect(headerSettings.modeSwitchHeight).toBeLessThanOrEqual(42);
    expect(headerSettings.topLineHeight).toBeLessThanOrEqual(42);
    expect(headerSettings.topLineBorderBottom).toBe('0px');
    const centerSpreadExcess = Math.max(0, headerSettings.centerSpread - HEADER_CENTER_SPREAD_LIMIT_PX);
    expect(
      centerSpreadExcess,
      `header center spread exceeded ${HEADER_CENTER_SPREAD_LIMIT_PX}px by more than one CSS layout quantum (${CSS_LAYOUT_QUANTUM_PX}px) · spread=${headerSettings.centerSpread} centers=${JSON.stringify(headerSettings.centerPositions)}`
    ).toBeLessThanOrEqual(CSS_LAYOUT_QUANTUM_PX);
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
  test('requires workspace choice on first entry, reload and re-entry', async ({ browser, page }) => {
    const prepare = async p => {
      await installOptionalRemoteMocks(p);
      await p.addInitScript(() => {
        window.__FOXBEAR_E2E__ = true;
        window.__FOXBEAR_SKIP_OPTIONAL_REMOTE__ = true;
        window.__FOXBEAR_E2E_DISABLE_AUTO_DIALOGS__ = true;
      });
    };
    const assertChoice = async p => {
      await expectRuntimeHealthy(expect, p);
      await expect(p.locator('#uiModeChooser')).toBeVisible();
      await expect(p.locator('#uiModeChooser')).toHaveAttribute('data-required', 'true');
      await expect(p.locator('body')).toHaveAttribute('data-ui-mode', 'unselected');
      await expect(p.locator('#uiModeChooserClose')).toBeHidden();
      await p.keyboard.press('Escape');
      await expect(p.locator('#uiModeChooser')).toBeVisible();
      expect(await p.locator('.app-shell').evaluate(n => n.inert)).toBeTruthy();
      const snapshot = await p.evaluate(() => window.FoxBearUiModeController.getSnapshot());
      expect(snapshot.restoredSource).toBe('required-choice');
      expect(snapshot.sessionContract.sameUrlReentry).toBe('show-chooser');
    };
    await prepare(page);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await assertChoice(page);
    for (const [width, height] of [[320,568],[390,844],[844,390],[768,1024],[1440,900]]) {
      await page.setViewportSize({ width, height });
      expect(await page.locator('#uiModeChooserPanel').evaluate(n => n.scrollWidth <= n.clientWidth)).toBeTruthy();
      const panelBox = await page.locator('#uiModeChooserPanel').boundingBox();
      expect(panelBox.x).toBeGreaterThanOrEqual(0);
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width);
      for (const id of ['uiModeAiBtn', 'uiModeExpertBtn']) {
        const card = page.locator('#' + id);
        await card.scrollIntoViewIfNeeded();
        const box = await card.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
    await page.locator('#uiModeAiBtn').click();
    await expect(page.locator('#uiModeChooser')).toBeHidden();
    await expect(page.locator('body')).toHaveAttribute('data-ui-mode', 'ai');
    await page.locator('#uiModeSwitchBtn').click();
    await expect(page.locator('#uiModeChooser')).toHaveAttribute('data-required', 'false');
    await expect(page.locator('#uiModeAiBtn')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#uiModeChooser')).toBeHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertChoice(page);
    await page.locator('#uiModeExpertBtn').click();
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await assertChoice(page);
    const freshContext = await browser.newContext();
    try {
      const freshPage = await freshContext.newPage();
      await prepare(freshPage);
      await freshPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
      await assertChoice(freshPage);
    } finally { await freshContext.close(); }
  });

});


test('workflow guidance follows real import, master and clear in both workspaces', async ({ page }) => {
  const { createSyntheticWavFiles, removeDirSafe } = require('./helpers/foxbear-e2e-helpers');
  const temp = createSyntheticWavFiles(1, { seconds: 2, gain: 0.08 });
  try {
    await navigateToApp(page, { disableAutoDialogs: true, uiMode: 'ai' });
    await expect(page.locator('[data-workflow-step][aria-current="step"]')).toHaveAttribute('data-workflow-step', '1');
    await expect(page.locator('#queueEmptyState')).toBeVisible();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.locator('.workflow-guide').evaluate(node => node.scrollWidth <= node.clientWidth)).toBeTruthy();
    }
    await page.setInputFiles('#fileInput', temp.files);
    await expect(page.locator('#queueEmptyState')).toBeHidden();
    await expect(page.locator('#masterSelectedBtn')).toBeEnabled({ timeout: 30000 });
    await expect(page.locator('#workflowStatus')).toContainText('추천 설정');
    await expect(page.locator('[data-workflow-step][aria-current="step"]')).toHaveAttribute('data-workflow-step', '2');
    await page.locator('#bottomPreviewMasterBtn').click();
    await expect(page.locator('[data-workflow-step][aria-current="step"]')).toHaveAttribute('data-workflow-step', '4', { timeout: 45000 });
    await expect(page.locator('#workflowStatus')).toContainText('마스터링이 완료');
    const resultPanel = page.locator('.track-export-ready-panel').first();
    await expect(resultPanel.locator('.track-result-compare')).toBeVisible();
    await expect(resultPanel.locator('.track-result-download')).toBeVisible();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const button of await resultPanel.locator('button').all()) {
        const box = await button.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }
    }
    await resultPanel.locator('.track-result-compare').click();
    await expect(page.locator('#previewDialog')).toBeVisible();
    await expect(page.locator('.waveform-compare-head strong')).toContainText('foxbear-e2e-01');
    await expect(page.locator('.waveform-compare-row')).toHaveCount(2);
    await page.locator('#previewDialogClose').click();
    await resultPanel.locator('.track-result-download').click();
    await expect(page.locator('.download-options-panel-v1574')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('#uiModeSwitchBtn').click();
    await page.locator('#uiModeExpertBtn').click();
    await expect(page.locator('#workflowStatus')).toContainText('마스터링이 완료');
    const summary = page.locator('.output-help summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.output-help')).toHaveAttribute('open', '');
    await expect(page.locator('.output-help dd').first()).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#clearBtn').click();
    await expect(page.locator('#queueEmptyState')).toBeVisible();
    await expect(page.locator('[data-workflow-step][aria-current="step"]')).toHaveAttribute('data-workflow-step', '1');
    await expectRuntimeHealthy(expect, page);
  } finally { removeDirSafe(temp.dir); }
});


test('studio redesign keeps panels and controls usable across viewport sizes', async ({ page }) => {
  await navigateToApp(page, { disableAutoDialogs: true, uiMode: 'expert' });
  await expectRuntimeHealthy(expect, page);
  const advanced = page.locator('.console-advanced');
  expect(await advanced.evaluate(n => n.open)).toBe(page.viewportSize().width >= 900);
  if (!(await advanced.evaluate(n => n.open))) await advanced.locator('summary').click();
  await expect(page.locator('#genreSelect')).toBeAttached();
  const before = await page.locator('#genreSelect').inputValue();
  await advanced.locator('summary').click();
  await expect(page.locator('.control-zone-genre')).toBeHidden();
  await advanced.locator('summary').press('Enter');
  await expect(page.locator('.control-zone-genre')).toBeVisible();
  expect(await page.locator('#genreSelect').inputValue()).toBe(before);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ['expert', 'ai']) {
      await page.locator('#uiModeSwitchBtn').click();
      await page.locator(mode === 'ai' ? '#uiModeAiBtn' : '#uiModeExpertBtn').click();
      await expect(page.locator('body')).toHaveAttribute('data-ui-mode', mode);
      const geometry = await page.evaluate(() => {
        const selectors = ['.workflow-guide', '.console-panel', '.queue-panel', '.inspect-panel', '.action-panel', '.engine-control-grid', '.upload-stage'];
        const bounds = selectors.flatMap(selector => Array.from(document.querySelectorAll(selector))).filter(n => n.getBoundingClientRect().width && getComputedStyle(n).visibility !== 'hidden').map(n => {
          const r = n.getBoundingClientRect();
          return { name: n.className, left: r.left, right: r.right, overflow: n.scrollWidth - n.clientWidth };
        });
        const consoleRect = document.querySelector('.console-panel').getBoundingClientRect();
        const queueRect = document.querySelector('.queue-panel').getBoundingClientRect();
        return { bounds, consoleRight: consoleRect.right, queueLeft: queueRect.left, queueTop: queueRect.top, consoleBottom: consoleRect.bottom };
      });
      for (const box of geometry.bounds) {
        expect(box.left, `${mode} ${width}px ${box.name}`).toBeGreaterThanOrEqual(-1);
        expect(box.right, `${mode} ${width}px ${box.name}`).toBeLessThanOrEqual(width + 1);
        expect(box.overflow, `${mode} ${width}px ${box.name}`).toBeLessThanOrEqual(2);
      }
      if (mode === 'expert' && width >= 900) expect(geometry.queueLeft).toBeGreaterThanOrEqual(geometry.consoleRight);
      else expect(geometry.queueTop).toBeGreaterThanOrEqual(geometry.consoleBottom);
    }
  }
  await page.locator('#subscribeNudge').evaluate(n => n.classList.add('show'));
  expect(await page.locator('#subscribeNudge').evaluate(n => getComputedStyle(n).position)).toBe('static');
  await expectRuntimeHealthy(expect, page);
});


test('studio text stays readable on chooser, controls and loaded tracks', async ({ page }) => {
  const { createSyntheticWavFiles, removeDirSafe } = require('./helpers/foxbear-e2e-helpers');
  const temp = createSyntheticWavFiles(1, { seconds: 2 });
  const assertContrast = async selector => {
    const samples = await page.locator(selector).evaluateAll(nodes => {
      const rgba = color => (color.match(/[\d.]+/g) || []).map(Number);
      const blend = (front, back) => {
        const alpha = front[3] ?? 1;
        return front.slice(0, 3).map((v, i) => v * alpha + back[i] * (1 - alpha)).concat(1);
      };
      const luminance = color => color.slice(0, 3).map(v => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      return nodes.filter(n => n.checkVisibility() && n.textContent.trim()).map(n => {
        let background = [13, 20, 28, 1];
        const ancestors = [];
        for (let node = n; node; node = node.parentElement) ancestors.unshift(node);
        for (const node of ancestors) background = blend(rgba(getComputedStyle(node).backgroundColor), background);
        const style = getComputedStyle(n);
        const foreground = blend(rgba(style.color), background);
        const light = luminance(foreground), dark = luminance(background);
        return { text: n.textContent.trim().slice(0, 60), ratio: (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05), opacity: Number(style.opacity) };
      });
    });
    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) {
      expect(sample.opacity, sample.text).toBe(1);
      expect(sample.ratio, sample.text).toBeGreaterThanOrEqual(4.5);
    }
  };
  try {
    await navigateToApp(page, { disableAutoDialogs: true, uiMode: 'unselected' });
    await expect(page.locator('#uiModeChooser')).toBeVisible();
    await assertContrast('.ui-mode-choice-copy, .ui-mode-choice-card > small, .ui-mode-chooser-footnote');
    await page.locator('#uiModeExpertBtn').click();
    await assertContrast('.brand-command-label, .brand-command-device-text, .brand-command-studio, .designer-mini > span, .workflow-status, .queue-empty-state p, .stat-card span, .select-popup-trigger');
    await assertContrast('#masterSelectedBtn, #masterAllBtn');
    await page.setInputFiles('#fileInput', temp.files);
    await expect(page.locator('#masterSelectedBtn')).toBeEnabled({ timeout: 30000 });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await assertContrast('.track-card h3, .track-meta, #masterSelectedBtn, #bottomPreviewMasterBtn');
    }
    await expectRuntimeHealthy(expect, page);
  } finally { removeDirSafe(temp.dir); }
});


test('recovers a native file selection made while the app script is still loading', async ({ page }) => {
  const { createSyntheticWavFiles, removeDirSafe } = require('./helpers/foxbear-e2e-helpers');
  const temp = createSyntheticWavFiles(1, { seconds: 2 });
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await installOptionalRemoteMocks(page);
  await page.addInitScript(() => { window.__FOXBEAR_E2E__ = true; window.__FOXBEAR_SKIP_OPTIONAL_REMOTE__ = true; window.__FOXBEAR_E2E_DISABLE_AUTO_DIALOGS__ = true; });
  await page.route('**/src/app.js?*', async route => { await held; await route.continue(); });
  try {
    await page.goto(APP_URL, { waitUntil: 'commit' });
    await page.locator('#fileInput').waitFor({ state: 'attached' });
    await page.setInputFiles('#fileInput', temp.files);
    expect(await page.evaluate(() => Boolean(window.FoxBearRuntimeHealth?.getReport?.()?.appReady))).toBe(false);
    release();
    await expectRuntimeHealthy(expect, page);
    await expect(page.locator('.track-card')).toHaveCount(1, { timeout: 30000 });
    await page.locator('#uiModeAiBtn').click();
    await expect(page.locator('#masterSelectedBtn')).toBeEnabled({ timeout: 30000 });
    await page.locator('#uiModeSwitchBtn').click();
    await page.locator('#uiModeExpertBtn').click();
    await expect(page.locator('.track-card')).toHaveCount(1);
  } finally { release(); removeDirSafe(temp.dir); }
});

test('notice bursts stay compact, dismissible and clear of the mobile transport', async ({ page }) => {
  await navigateToApp(page, { uiMode: 'ai', disableAutoDialogs: true });
  await expectRuntimeHealthy(expect, page);
  await page.setInputFiles('#fileInput', { name: 'notice-test.wav', mimeType: 'audio/wav', buffer: require('./helpers/foxbear-e2e-helpers').makeTinyWavBuffer({ seconds: 2 }) });
  await expect(page.locator('#masterSelectedBtn')).toBeEnabled({ timeout: 30000 });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.evaluate(() => {
      document.getElementById('toast').replaceChildren();
      for (let i = 0; i < 8; i++) showToast(`notice ${i}`, { duration: 10000 });
      showToast('notice 7', { duration: 10000 });
    });
    const items = page.locator('.foxbear-toast-item');
    await expect(items).toHaveCount(width <= 720 ? 1 : 2);
    const box = await items.last().boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.height).toBeLessThanOrEqual(160);
    await expect.poll(async () => {
      const current = await items.last().boundingBox();
      const dock = await page.locator('#bottomPreviewDock').boundingBox();
      return current.y + current.height - dock.y;
    }).toBeLessThanOrEqual(1);
    await items.last().getByRole('button', { name: '알림 닫기' }).press('Enter');
    await expect(items).toHaveCount(width <= 720 ? 0 : 1);
  }
  await expectRuntimeHealthy(expect, page);
});


test('full queue waits for every analysis and masters both tracks without skipping', async ({ page }) => {
  const { createSyntheticWavFiles, removeDirSafe } = require('./helpers/foxbear-e2e-helpers');
  const temp = createSyntheticWavFiles(2, { seconds: 2 });
  try {
    await navigateToApp(page, { uiMode: 'expert', disableAutoDialogs: true });
    await expectRuntimeHealthy(expect, page);
    await page.evaluate(() => {
      const original = window.analyzeTrack;
      window.analyzeTrack = async (track, task) => {
        if (track.name.endsWith('02.wav')) await new Promise(resolve => { window.releaseBatchAnalysis = resolve; });
        return original(track, task);
      };
    });
    await page.setInputFiles('#fileInput', temp.files);
    await expect(page.locator('.track-card')).toHaveCount(2, { timeout: 30000 });
    await expect(page.locator('.track-card .status-ready')).toHaveCount(1, { timeout: 30000 });
    await expect(page.locator('#masterAllBtn')).toBeDisabled();
    await expect(page.locator('#masterAllBtn')).toContainText('분석 대기 1곡');
    await expect(page.locator('#workflowStatus')).toContainText('분석 준비 1/2곡');
    expect(await page.evaluate(() => masterAllTracks())).toBe(false);
    await expect(page.locator('.track-card .status-processing')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => typeof window.releaseBatchAnalysis)).toBe('function');
    await page.evaluate(() => window.releaseBatchAnalysis());
    await expect(page.locator('#masterAllBtn')).toBeEnabled({ timeout: 30000 });
    await expect(page.locator('#masterAllBtn')).toHaveText('전체 2곡 마스터링');
    await page.locator('#masterAllBtn').evaluate(n => n.scrollIntoView({ block: 'center' }));
    await page.locator('#masterAllBtn').click();
    await expect(page.locator('.track-result-compare')).toHaveCount(2, { timeout: 60000 });
    await expect(page.locator('.track-card .status-done')).toHaveCount(2);
    await expect(page.locator('#workflowStatus')).toContainText('마스터링이 완료');
    const readiness = await page.evaluate(() => window.FoxBearUiModeService.getBatchReadiness([
      { status: 'ready', analysis: {} }, { status: 'error', error: 'invalid audio' }
    ]));
    expect(readiness).toMatchObject({ ready: 1, pending: 0, failed: 1, canStart: true });
    await expectRuntimeHealthy(expect, page);
  } finally { removeDirSafe(temp.dir); }
});
