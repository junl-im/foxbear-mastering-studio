'use strict';
const { test, expect } = require('@playwright/test');
const { expectRuntimeHealthy, navigateToApp } = require('./helpers/foxbear-e2e-helpers');
const { stageDownloadOptionsFixture } = require('./helpers/visual-fixture-builders');

test.describe('v1.6.79 mobile download and batch controls visual contract', () => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 1280, height: 900 }]) {
    test(`download sheet and batch controls fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await navigateToApp(page);
      await expectRuntimeHealthy(expect, page);
      const staged = await page.evaluate(stageDownloadOptionsFixture, {
        fixtureId: `download-options-v1586-${viewport.width}`,
        familyLabels: ['MP3', 'WAV'],
        bitrates: [128, 192, 320]
      });
      expect(staged.familyCount).toBe(2);
      expect(staged.optionCount).toBe(3);

      const panel = page.locator('.download-options-panel-v1574');
      await expect(panel).toBeVisible();
      const box = await panel.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      await expect(page.locator('.download-format-family')).toHaveCount(2);
      await expect(page.locator('.download-format-family[aria-pressed="true"]')).toHaveCount(1);
      await page.screenshot({ path: `test-results/v1574-download-${viewport.width}.png`, fullPage: true });
    });
  }
});
