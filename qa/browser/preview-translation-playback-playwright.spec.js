const { test, expect } = require('@playwright/test');
const { createSyntheticWavFiles, expectRuntimeHealthy, navigateToApp, removeDirSafe } = require('./helpers/foxbear-e2e-helpers');

test.describe('FoxBear uninterrupted preview translation routing', () => {
  test('keeps one playing audio element while switching studio, phone, laptop, and mono', async ({ page }) => {
    test.setTimeout(75000);
    const temp = createSyntheticWavFiles(1, { seconds: 4, gain: 0.08 });
    try {
      await navigateToApp(page, { disableAutoDialogs: true });
      await expectRuntimeHealthy(expect, page);
      await page.setInputFiles('#fileInput', temp.files);
      await page.waitForFunction(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        return Boolean(audio && audio.readyState >= 1 && audio.duration > 1);
      }, null, { timeout: 30000 });

      const playButton = page.locator('#bottomPreviewPlayBtn');
      await expect(playButton).toBeVisible({ timeout: 10000 });
      await expect(playButton).toBeEnabled({ timeout: 10000 });
      const beforePlay = await page.evaluate(() => {
        const button = document.querySelector('#bottomPreviewPlayBtn');
        const rect = button?.getBoundingClientRect?.();
        const center = rect ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
        return {
          modalCount: document.querySelectorAll('.ai-recommend-dialog-backdrop, [aria-modal="true"]:not([hidden])').length,
          buttonDisabled: Boolean(button?.disabled),
          buttonVisible: Boolean(rect && rect.width > 0 && rect.height > 0),
          topElement: center?.id || center?.className || center?.tagName || null,
          clickTargetOwned: Boolean(button && center && button.contains(center))
        };
      });
      expect(beforePlay.modalCount, `blocking dialogs before playback · ${JSON.stringify(beforePlay)}`).toBe(0);
      expect(beforePlay.buttonDisabled, `play button disabled · ${JSON.stringify(beforePlay)}`).toBeFalsy();
      expect(beforePlay.clickTargetOwned, `play button intercepted · ${JSON.stringify(beforePlay)}`).toBeTruthy();
      await playButton.click({ timeout: 10000 });
      await page.waitForFunction(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        return Boolean(audio && !audio.paused && !audio.ended && audio.currentTime >= 0);
      }, null, { timeout: 10000 });

      const start = await page.evaluate(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        const probe = { audio, playCount: 0, pauseCount: 0, startedAt: audio.currentTime };
        audio.addEventListener('play', () => { probe.playCount += 1; });
        audio.addEventListener('pause', () => { probe.pauseCount += 1; });
        window.__foxbearTranslationPlaybackProbe = probe;
        return {
          currentTime: audio.currentTime,
          mode: audio._foxbearTranslationController?.mode || null,
          pathCount: Object.keys(audio._foxbearTranslationController?.paths || {}).length
        };
      });
      expect(start.mode).toBe('studio');
      expect(start.pathCount).toBe(1);

      for (const mode of ['phone', 'laptop', 'mono', 'studio']) {
        await page.locator(`[data-preview-translation-mode="${mode}"]`).click();
        await page.waitForFunction(target => {
          const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
          return Boolean(audio && audio === window.__foxbearTranslationPlaybackProbe?.audio
            && !audio.paused && audio._foxbearTranslationController?.mode === target);
        }, mode, { timeout: 5000 });
        await page.waitForTimeout(220);
      }

      const result = await page.evaluate(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        const probe = window.__foxbearTranslationPlaybackProbe;
        return {
          sameAudio: audio === probe.audio,
          paused: audio.paused,
          currentTime: audio.currentTime,
          startedAt: probe.startedAt,
          playCount: probe.playCount,
          pauseCount: probe.pauseCount,
          mode: audio._foxbearTranslationController?.mode || null,
          contextState: audio._foxbearTranslationController?.context?.state || null,
          pathCount: Object.keys(audio._foxbearTranslationController?.paths || {}).length
        };
      });
      expect(result.sameAudio).toBeTruthy();
      expect(result.paused).toBeFalsy();
      expect(result.currentTime).toBeGreaterThan(result.startedAt + 0.25);
      expect(result.pauseCount).toBe(0);
      expect(result.playCount).toBe(0);
      expect(result.mode).toBe('studio');
      expect(result.contextState).not.toBe('closed');
      expect(result.pathCount).toBe(1);
    } finally {
      removeDirSafe(temp.dir);
    }
  });
});
