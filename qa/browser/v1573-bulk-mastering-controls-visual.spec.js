const { test, expect } = require('@playwright/test');
const { expectRuntimeHealthy, navigateToApp } = require('./helpers/foxbear-e2e-helpers');
const { stageBulkMasteringHudFixture } = require('./helpers/visual-fixture-builders');

test.describe('v1.7.5 bulk mastering controls visual layout', () => {
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

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`recovery guidance and retry stay inside a short mobile viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await navigateToApp(page);
    await expectRuntimeHealthy(expect, page);
    await page.evaluate(stageBulkMasteringHudFixture, { total: 6, currentIndex: 1 });
    await page.evaluate(() => {
      document.body.classList.add('bottom-preview-active');
      const row = document.querySelector('#bulkImportHudList .bulk-import-row:nth-child(3)');
      row.className = 'bulk-import-row is-error';
      const details = document.createElement('details');
      details.className = 'bulk-import-row-recovery';
      details.open = true;
      const trigger = document.createElement('summary');
      trigger.textContent = '해결 방법 보기';
      const message = document.createElement('p');
      message.textContent = '파일 재생 상태를 확인한 다음 다른 브라우저를 선택하고 WAV 24bit 출력으로 다시 시도하세요. 완료된 파일은 유지됩니다.';
      details.append(trigger, message);
      row.querySelector('.bulk-import-row-main').appendChild(details);
      document.querySelector('#bulkImportHudCancel').hidden = true;
      const retry = document.querySelector('#bulkImportHudRetryFailed');
      retry.hidden = false;
      retry.textContent = '미완료 2곡 다시 실행';
    });
    await expect(page.locator('#bulkImportHudRetryFailed')).toBeVisible();
    await page.waitForTimeout(220); // Let the HUD entrance transition settle before measuring its bounds.
    const geometry = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const card = rect('.bulk-import-hud-card');
      const list = rect('#bulkImportHudList');
      const retry = rect('#bulkImportHudRetryFailed');
      const guidance = document.querySelector('.bulk-import-row-recovery');
      const rows = Array.from(document.querySelectorAll('#bulkImportHudList .bulk-import-row')).map(row => row.getBoundingClientRect());
      return { cardTop: card.top, cardBottom: card.bottom, listTop: list.top, listBottom: list.bottom,
        retryTop: retry.top, retryBottom: retry.bottom, retryHeight: retry.height,
        rowsOverlap: rows.some((row, index) => index > 0 && row.top < rows[index - 1].bottom - 1),
        guidanceOverflows: guidance.scrollWidth > guidance.clientWidth + 1 };
    });
    expect(geometry.cardTop).toBeGreaterThanOrEqual(0);
    expect(geometry.cardBottom).toBeLessThanOrEqual(viewport.height - 4);
    expect(geometry.listTop).toBeGreaterThanOrEqual(geometry.cardTop);
    expect(geometry.listBottom).toBeLessThanOrEqual(geometry.cardBottom);
    expect(geometry.retryTop).toBeGreaterThanOrEqual(geometry.cardTop);
    expect(geometry.retryBottom).toBeLessThanOrEqual(geometry.cardBottom);
    expect(geometry.retryHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.rowsOverlap).toBe(false);
    expect(geometry.guidanceOverflows).toBe(false);
  });
}
