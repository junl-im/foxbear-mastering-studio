'use strict';
const { test, expect } = require('@playwright/test');

test.describe('v1.5.81 mobile download and batch controls visual contract', () => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 1280, height: 900 }]) {
    test(`download sheet and batch controls fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.evaluate(() => {
        document.body.classList.add('download-options-open');
        const sheet = document.createElement('section');
        sheet.className = 'download-options-panel download-options-panel-v1574';
        sheet.dataset.formatFamily = 'mp3';
        sheet.innerHTML = '<div class="download-format-families"><button class="download-format-family current">MP3</button><button class="download-format-family">WAV</button></div><div class="download-options-list"><button class="download-format-option"><span>128</span><b>kbps</b></button><button class="download-format-option"><span>192</span><b>kbps</b></button><button class="download-format-option"><span>320</span><b>kbps</b></button></div><div class="download-options-actions download-options-actions-primary"><button>선택 형식 다운로드</button></div>';
        const backdrop = document.createElement('div');
        backdrop.className = 'download-options-backdrop';
        backdrop.appendChild(sheet);
        document.body.appendChild(backdrop);
      });
      const panel = page.locator('.download-options-panel-v1574');
      const box = await panel.boundingBox();
      expect(box).not.toBeNull();
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      await expect(page.locator('.download-format-family')).toHaveCount(2);
      await page.screenshot({ path: `test-results/v1574-download-${viewport.width}.png`, fullPage: true });
    });
  }
});
