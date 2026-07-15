const { test, expect } = require('@playwright/test');
const { createSyntheticWavFiles, expectRuntimeHealthy, navigateToApp, removeDirSafe } = require('./helpers/foxbear-e2e-helpers');

const RUN_DEEP = process.env.FOXBEAR_E2E_DEEP === '1';

test.describe('FoxBear 35-track import/master/export browser scenario', () => {
  test('accepts 35 synthetic WAV files and shows bulk import HUD continuity', async ({ page }) => {
    test.setTimeout(RUN_DEEP ? 180000 : 60000);
    const temp = createSyntheticWavFiles(35, { seconds: RUN_DEEP ? 0.45 : 0.18, gain: 0.08 });
    try {
      await navigateToApp(page);
      await expectRuntimeHealthy(expect, page);
      await expect(page.locator('#fileInput')).toHaveCount(1);

      await page.setInputFiles('#fileInput', temp.files);
      await expect(page.locator('#bulkImportHud')).toHaveAttribute('aria-hidden', 'false', { timeout: 20000 });
      await expect(page.locator('#bulkImportHudTitle')).toContainText(/대량|HUD|마스터링|업로드/, { timeout: 20000 });

      await page.waitForFunction(() => {
        const count = document.querySelectorAll('#trackList [data-track-id], #trackList .track-card, #trackList .track-item, #queuePreview > *').length;
        const badge = document.querySelector('#queueCount')?.textContent || '';
        return count >= 1 || /\d/.test(badge);
      }, null, { timeout: 30000 });

      const snapshot = await page.evaluate(() => ({
        runtime: window.FoxBearRuntimeHealth && window.FoxBearRuntimeHealth.getReport && window.FoxBearRuntimeHealth.getReport(),
        bulk: window.FoxBearBulkImportHudView && window.FoxBearBulkImportHudView.getSnapshot && window.FoxBearBulkImportHudView.getSnapshot(),
        memory: window.FoxBearMemoryGuard && window.FoxBearMemoryGuard.getSnapshot && window.FoxBearMemoryGuard.getSnapshot(),
        exportReadiness: window.FoxBearExportGuard && window.FoxBearExportGuard.getReadiness && window.FoxBearExportGuard.getReadiness(),
        masterAllDisabled: document.querySelector('#masterAllBtn')?.disabled ?? true,
        masterSelectedDisabled: document.querySelector('#masterSelectedBtn')?.disabled ?? true,
        zipDisabled: document.querySelector('#zipBtn')?.disabled ?? true,
        queueText: document.querySelector('#queueCount')?.textContent || ''
      }));

      expect(snapshot.runtime.bootFailed).toBeFalsy();
      expect(snapshot.runtime.resourceFailures || []).toEqual([]);
      expect(snapshot.bulk.total || 0).toBeGreaterThan(1);
      expect(snapshot.bulk.total || 0).toBeLessThanOrEqual(35);
      expect(snapshot.queueText).toMatch(/\d/);

      if (!RUN_DEEP) return;

      await page.locator('#masterAllBtn').click({ timeout: 30000 });
      await expect(page.locator('#bulkImportHudTitle')).toContainText(/마스터링|HUD/, { timeout: 30000 });
      await page.waitForFunction(() => {
        const text = document.querySelector('#bulkImportHudText')?.textContent || '';
        return /완성|오류|마스터링/.test(text);
      }, null, { timeout: 120000 });

      const after = await page.evaluate(() => ({
        bulk: window.FoxBearBulkImportHudView && window.FoxBearBulkImportHudView.getSnapshot && window.FoxBearBulkImportHudView.getSnapshot(),
        memory: window.FoxBearMemoryGuard && window.FoxBearMemoryGuard.getSnapshot && window.FoxBearMemoryGuard.getSnapshot(),
        exportReadiness: window.FoxBearExportGuard && window.FoxBearExportGuard.getReadiness && window.FoxBearExportGuard.getReadiness(),
        zipDisabled: document.querySelector('#zipBtn')?.disabled ?? true
      }));
      expect(after.memory).toBeTruthy();
      expect(after.memory.masteredBufferCount || 0).toBeLessThanOrEqual(2);
      expect(after.exportReadiness && after.exportReadiness.completedCount).toBeGreaterThan(0);
      expect(after.zipDisabled).toBeFalsy();
      await page.locator('#zipBtn').click({ timeout: 30000 });
    } finally {
      removeDirSafe(temp.dir);
    }
  });
});
