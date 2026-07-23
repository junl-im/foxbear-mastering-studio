const { test, expect } = require('@playwright/test');
const { expectRuntimeHealthy, navigateToApp } = require('./helpers/foxbear-e2e-helpers');

test.describe('v1.5.84 bulk mastering controls visual layout', () => {
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

      const rows = Array.from({ length: 6 }, (_, index) => {
        const isCurrent = index === 1;
        const isDone = index === 0;
        const progress = isDone ? 100 : isCurrent ? 48 : 0;
        const row = document.createElement('div');
        row.className = `bulk-import-row is-${isCurrent ? 'running is-current' : isDone ? 'done' : 'queued'}`;
        row.setAttribute('role', 'listitem');

        const number = document.createElement('span');
        number.className = 'bulk-import-row-number';
        number.textContent = String(index + 1).padStart(2, '0');

        const main = document.createElement('span');
        main.className = 'bulk-import-row-main';
        const name = document.createElement('strong');
        name.textContent = `sample-${String(index + 1).padStart(2, '0')}.wav`;
        const detail = document.createElement('small');
        detail.textContent = isCurrent
          ? '마스터링 중 · 남은 약 1분 12초'
          : isDone
            ? '완료 · 소요 2분 03초'
            : `완료 예상 약 ${index + 2}분 후`;
        main.append(name, detail);

        const state = document.createElement('span');
        state.className = 'bulk-import-row-state';
        state.textContent = isCurrent ? '현재 진행' : isDone ? '완성' : '마스터링 대기';

        const meter = document.createElement('span');
        meter.className = 'bulk-import-row-meter';
        const meterFill = document.createElement('i');
        meterFill.style.width = `${progress}%`;
        meter.appendChild(meterFill);

        const percent = document.createElement('span');
        percent.className = 'bulk-import-row-percent';
        percent.textContent = `${progress}%`;

        row.append(number, main, state, meter, percent);
        return row;
      });
      list.replaceChildren(...rows);
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
