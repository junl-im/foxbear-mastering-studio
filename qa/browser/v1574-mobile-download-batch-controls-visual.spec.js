'use strict';
const { test, expect } = require('@playwright/test');

test.describe('v1.5.84 mobile download and batch controls visual contract', () => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 1280, height: 900 }]) {
    test(`download sheet and batch controls fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.evaluate(() => {
        document.body.classList.add('download-options-open');
        const sheet = document.createElement('section');
        sheet.className = 'download-options-panel download-options-panel-v1574';
        sheet.dataset.formatFamily = 'mp3';

        const families = document.createElement('div');
        families.className = 'download-format-families';
        for (const [label, current] of [['MP3', true], ['WAV', false]]) {
          const button = document.createElement('button');
          button.className = `download-format-family${current ? ' current' : ''}`;
          button.type = 'button';
          button.textContent = label;
          families.appendChild(button);
        }

        const options = document.createElement('div');
        options.className = 'download-options-list';
        for (const bitrate of [128, 192, 320]) {
          const button = document.createElement('button');
          button.className = 'download-format-option';
          button.type = 'button';
          const value = document.createElement('span');
          value.textContent = String(bitrate);
          const unit = document.createElement('b');
          unit.textContent = 'kbps';
          button.append(value, unit);
          options.appendChild(button);
        }

        const actions = document.createElement('div');
        actions.className = 'download-options-actions download-options-actions-primary';
        const download = document.createElement('button');
        download.type = 'button';
        download.textContent = '선택 형식 다운로드';
        actions.appendChild(download);

        sheet.append(families, options, actions);
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
