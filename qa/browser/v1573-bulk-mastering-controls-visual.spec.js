const { test, expect } = require('@playwright/test');
const { expectRuntimeHealthy, navigateToApp } = require('./helpers/foxbear-e2e-helpers');
const { stageBulkMasteringHudFixture } = require('./helpers/visual-fixture-builders');

test.describe('v1.6.72 bulk mastering controls visual layout', () => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 760 }]) {
    test(`controls and current row remain visible at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await navigateToApp(page);
      await expectRuntimeHealthy(expect, page);
      const staged = await page.evaluate(stageBulkMasteringHudFixture, {
        total: 6,
        currentIndex: 1,
        currentProgress: 48,
        remainingText: '약 1분 12초'
      });
      expect(staged).toEqual({ total: 6, currentIndex: 1, currentProgress: 48, rowCount: 6 });

      const hud = page.locator('#bulkImportHud');
      await expect(hud).toBeVisible();
      const box = await hud.boundingBox();
      expect(box).toBeTruthy();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      await expect(page.locator('#bulkImportHudCancel')).toBeVisible();
      await expect(page.locator('#bulkImportHudFilter')).toBeVisible();
      await expect(page.locator('.bulk-import-row.is-current')).toBeVisible();
      await expect(page.locator('.bulk-import-row[aria-current="step"]')).toHaveCount(1);
      const image = await hud.screenshot();
      expect(image.byteLength).toBeGreaterThan(2500);
    });
  }
});
