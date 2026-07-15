const { test, expect } = require('@playwright/test');
const { getReleaseMetadata } = require('../../tools/release-metadata');
const { APP_URL, expectRuntimeHealthy } = require('./helpers/foxbear-e2e-helpers');

const RELEASE = getReleaseMetadata();

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
    expect(report.version).toContain(RELEASE.assetVersion);
    expect(consoleErrors).toEqual([]);
  });
});
