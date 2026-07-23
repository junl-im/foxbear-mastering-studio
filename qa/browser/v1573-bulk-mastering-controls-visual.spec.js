const { test, expect } = require('@playwright/test');
const { expectRuntimeHealthy, navigateToApp } = require('./helpers/foxbear-e2e-helpers');

test.describe('v1.5.80 bulk mastering controls visual layout', () => {
  async function stageBatchHud(page) {
    await page.evaluate(() => {
      const hud = document.querySelector('#bulkImportHud');
      const title = document.querySelector('#bulkImportHudTitle');
      const text = document.querySelector('#bulkImportHudText');
      const list = document.querySelector('#bulkImportHudList');
      hud.classList.add('show', 'has-current-track');
      hud.setAttribute('aria-hidden', 'false');
      hud.dataset.phase = 'mastering';
      hud.dataset.complete = 'false';
      title.textContent = '여러 곡 마스터링 · 6곡';
      text.textContent = '현재 2/6 · sample-02.wav · 48% · 현재 곡 약 1분 12초 남음';
      document.querySelector('#bulkImportHudMasterAll').hidden = true;
      document.querySelector('#bulkImportHudCancel').hidden = false;
      document.querySelector('#bulkImportHudRetryFailed').hidden = true;
      const filter = document.querySelector('#bulkImportHudFilter');
      filter.hidden = false;
      filter.closest('.bulk-import-hud-filter-wrap').hidden = false;
      list.innerHTML = Array.from({ length: 6 }, (_, index) => `
        <div class="bulk-import-row is-${index === 1 ? 'running is-current' : index === 0 ? 'done' : 'queued'}" role="listitem">
          <span class="bulk-import-row-number">${String(index + 1).padStart(2, '0')}</span>
          <span class="bulk-import-row-main"><strong>sample-${String(index + 1).padStart(2, '0')}.wav</strong><small>${index === 1 ? '마스터링 중 · 남은 약 1분 12초' : index === 0 ? '완료 · 소요 2분 03초' : `완료 예상 약 ${index + 2}분 후`}</small></span>
          <span class="bulk-import-row-state">${index === 1 ? '현재 진행' : index === 0 ? '완성' : '마스터링 대기'}</span>
          <span class="bulk-import-row-meter"><i style="width:${index === 0 ? 100 : index === 1 ? 48 : 0}%"></i></span>
          <span class="bulk-import-row-percent">${index === 0 ? 100 : index === 1 ? 48 : 0}%</span>
        </div>`).join('');
    });
  }

  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 760 }]) {
    test(`controls and current row remain visible at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await navigateToApp(page);
      await expectRuntimeHealthy(expect, page);
      await stageBatchHud(page);
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
      const image = await hud.screenshot();
      expect(image.byteLength).toBeGreaterThan(2500);
    });
  }
});
