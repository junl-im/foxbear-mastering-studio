const { test, expect } = require('@playwright/test');

const APP_URL = process.env.FOXBEAR_E2E_URL || 'http://127.0.0.1:8080';

test.describe('FoxBear browser runtime health', () => {
  test('boots without missing globals or resource failures', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.FoxBearRuntimeHealth && window.FoxBearRuntimeHealth.getReport), null, { timeout: 15000 });

    const report = await page.evaluate(() => window.FoxBearRuntimeHealth.getReport());
    expect(report.appReady).toBeTruthy();
    expect(report.bootFailed).toBeFalsy();
    expect(report.missingGlobals).toEqual([]);
    expect(report.resourceFailures).toEqual([]);
    expect(report.runtimeErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
