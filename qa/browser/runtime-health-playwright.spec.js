const { test, expect } = require('@playwright/test');
const { APP_URL, expectRuntimeHealthy } = require('./helpers/foxbear-e2e-helpers');

test.describe('FoxBear browser runtime health', () => {
  test('boots without missing globals, DOM ids, resource failures, or console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', message => {
      const text = message.text();
      if (message.type() === 'error' && !/Failed to load resource.*firebase|firestore|googleapis/i.test(text)) {
        consoleErrors.push(text);
      }
    });

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    const report = await expectRuntimeHealthy(expect, page);
    expect(report.version).toContain('1.4.26-wake-lock-state-sync');
    expect(consoleErrors).toEqual([]);
  });
});
