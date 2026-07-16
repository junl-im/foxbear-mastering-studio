'use strict';

const { test, expect } = require('@playwright/test');
const {
  createSyntheticWavFiles,
  expectRuntimeHealthy,
  navigateToApp,
  removeDirSafe
} = require('./helpers/foxbear-e2e-helpers');

async function waitForVisiblePlayControl(page) {
  await page.waitForFunction(() => {
    const queue = window.FoxBearBulkImportGuard?.getSnapshot?.();
    const render = window.FoxBearRenderScheduler?.getSnapshot?.();
    if (!queue || queue.active || queue.pending) return false;
    if (!render || render.pending || render.inRender) return false;
    const mobile = window.matchMedia?.('(max-width: 720px)')?.matches === true;
    const button = document.querySelector(mobile
      ? '#bottomPreviewPlayer .dock-integrated-toggle'
      : '#bottomPreviewPlayBtn');
    if (!button || button.disabled || !button.isConnected) return false;
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(top && button.contains(top));
  }, null, { timeout: 30000 });
  const mobile = await page.evaluate(() => window.matchMedia?.('(max-width: 720px)')?.matches === true);
  return page.locator(mobile
    ? '#bottomPreviewPlayer .dock-integrated-toggle'
    : '#bottomPreviewPlayBtn');
}

test.describe('FoxBear analysis cancellation and replacement playback', () => {
  test('cancels active bulk analysis without stale resurrection, then plays a replacement track', async ({ page }) => {
    test.setTimeout(90000);
    const bulk = createSyntheticWavFiles(35, { seconds: 2.5, sampleRate: 24000, gain: 0.07 });
    const replacement = createSyntheticWavFiles(1, { seconds: 12, sampleRate: 24000, gain: 0.08 });
    try {
      await page.addInitScript(() => {
        const originalArrayBuffer = File.prototype.arrayBuffer;
        File.prototype.arrayBuffer = function foxbearE2eDelayedArrayBuffer(...args) {
          const read = () => originalArrayBuffer.apply(this, args);
          if (window.__FOXBEAR_E2E_DELAY_SHORT_FILE_READS__ !== false && Number(this.size || 0) < 200000) {
            return new Promise((resolve, reject) => setTimeout(() => read().then(resolve, reject), 2500));
          }
          return read();
        };
        window.__FOXBEAR_E2E_DELAY_SHORT_FILE_READS__ = true;
      });
      await navigateToApp(page, { disableAutoDialogs: true });
      await expectRuntimeHealthy(expect, page);
      await page.setInputFiles('#fileInput', bulk.files);
      await page.waitForFunction(() => {
        const snapshot = window.FoxBearBulkImportGuard?.getSnapshot?.();
        return Boolean(snapshot && snapshot.active > 0 && snapshot.pending > 0);
      }, null, { timeout: 15000 });

      const clearButton = page.locator('#clearBtn');
      await expect(clearButton).toBeEnabled({ timeout: 5000 });
      const clearControl = await page.evaluate(() => {
        const button = document.getElementById('clearBtn');
        const state = { exists: Boolean(button), disabled: Boolean(button?.disabled), visible: Boolean(button && button.getBoundingClientRect().width > 0) };
        if (button && !button.disabled) button.click();
        return state;
      });
      expect(clearControl.exists, `clear control missing · ${JSON.stringify(clearControl)}`).toBeTruthy();
      expect(clearControl.disabled, `clear control disabled during analysis · ${JSON.stringify(clearControl)}`).toBeFalsy();
      await page.waitForFunction(() => {
        const snapshot = window.FoxBearBulkImportGuard?.getSnapshot?.();
        const trackCount = document.querySelectorAll('#trackList [data-track-id], #queuePreview > *').length;
        return Boolean(snapshot && snapshot.active === 0 && snapshot.pending === 0 && trackCount === 0);
      }, null, { timeout: 15000 });
      await page.waitForTimeout(1800);

      const cleared = await page.evaluate(() => ({
        queue: window.FoxBearBulkImportGuard?.getSnapshot?.() || null,
        trackCount: document.querySelectorAll('#trackList [data-track-id], #queuePreview > *').length,
        decode: window.FoxBearAudioDecodeService?.getDiagnostics?.() || null
      }));
      expect(cleared.queue?.active, JSON.stringify(cleared)).toBe(0);
      expect(cleared.queue?.pending, JSON.stringify(cleared)).toBe(0);
      expect(cleared.trackCount, `stale track resurrected · ${JSON.stringify(cleared)}`).toBe(0);
      expect(cleared.queue?.cancelledCount, `active analysis was not cancelled · ${JSON.stringify(cleared)}`).toBeGreaterThan(0);

      await page.evaluate(() => { window.__FOXBEAR_E2E_DELAY_SHORT_FILE_READS__ = false; });
      await page.setInputFiles('#fileInput', replacement.files);
      const playButton = await waitForVisiblePlayControl(page);
      await expect(playButton).toBeVisible();
      await expect(playButton).toBeEnabled();
      await playButton.click({ timeout: 10000 });
      await page.waitForFunction(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        return Boolean(audio && !audio.paused && !audio.ended && audio.currentTime >= 0);
      }, null, { timeout: 10000 });
      await page.waitForTimeout(500);

      const replacementState = await page.evaluate(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        return {
          trackCount: document.querySelectorAll('#trackList [data-track-id]').length,
          playing: Boolean(audio && !audio.paused && !audio.ended),
          currentTime: Number(audio?.currentTime || 0),
          queue: window.FoxBearBulkImportGuard?.getSnapshot?.() || null
        };
      });
      expect(replacementState.trackCount, JSON.stringify(replacementState)).toBe(1);
      expect(replacementState.playing, JSON.stringify(replacementState)).toBeTruthy();
      expect(replacementState.currentTime, JSON.stringify(replacementState)).toBeGreaterThan(0.1);
      expect(replacementState.queue?.active, JSON.stringify(replacementState)).toBe(0);
      expect(replacementState.queue?.pending, JSON.stringify(replacementState)).toBe(0);
    } finally {
      removeDirSafe(bulk.dir);
      removeDirSafe(replacement.dir);
    }
  });
});
