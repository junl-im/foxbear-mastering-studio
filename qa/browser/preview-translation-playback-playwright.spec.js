const { test, expect } = require('@playwright/test');
const { createSyntheticWavFiles, expectRuntimeHealthy, navigateToApp, removeDirSafe } = require('./helpers/foxbear-e2e-helpers');


async function waitForStablePreviewPlayControl(page) {
  await page.waitForFunction(() => {
    const queue = window.FoxBearBulkImportGuard?.getSnapshot?.();
    const render = window.FoxBearRenderScheduler?.getSnapshot?.();
    const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
    if (!queue || queue.active !== 0 || queue.pending !== 0) return false;
    if (!render || render.pending || render.inRender) return false;
    if (!audio || audio.readyState < 1 || !Number.isFinite(audio.duration) || audio.duration <= 1) return false;

    const mobile = window.matchMedia?.('(max-width: 720px)')?.matches === true;
    const button = document.querySelector(mobile
      ? '#bottomPreviewPlayer .dock-integrated-toggle'
      : '#bottomPreviewPlayBtn');
    if (!button || button.disabled || !button.isConnected) return false;
    const rect = button.getBoundingClientRect();
    const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const visible = rect.width > 0 && rect.height > 0 && center && button.contains(center);
    if (!visible) {
      delete window.__foxbearE2eStablePlayControl;
      return false;
    }
    const signature = `${mobile ? 'mobile' : 'desktop'}:${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
    const previous = window.__foxbearE2eStablePlayControl;
    if (!previous || previous.button !== button || previous.signature !== signature) {
      window.__foxbearE2eStablePlayControl = { button, signature, since: performance.now() };
      return false;
    }
    return performance.now() - previous.since >= 220;
  }, null, { timeout: 30000 });

  const mobile = await page.evaluate(() => window.matchMedia?.('(max-width: 720px)')?.matches === true);
  return page.locator(mobile
    ? '#bottomPreviewPlayer .dock-integrated-toggle'
    : '#bottomPreviewPlayBtn');
}

async function readPlaybackReadiness(page, playButton = null) {
  const buttonState = playButton
    ? await playButton.evaluate(button => {
        const rect = button.getBoundingClientRect();
        const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          id: button.id || null,
          className: button.className || null,
          disabled: Boolean(button.disabled),
          visible: rect.width > 0 && rect.height > 0,
          topElement: center?.id || center?.className || center?.tagName || null,
          clickTargetOwned: Boolean(center && button.contains(center))
        };
      }).catch(() => null)
    : null;

  return await page.evaluate(buttonState => {
    const isActuallyVisible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
        if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
        if (Number.parseFloat(style.opacity || '1') <= 0.01) return false;
        if (node !== element && style.pointerEvents === 'none') return false;
      }
      return true;
    };
    const dialogs = Array.from(document.querySelectorAll('.ai-recommend-dialog-backdrop, [aria-modal="true"]'))
      .filter(isActuallyVisible)
      .map(element => ({
        id: element.id || null,
        className: element.className || null,
        ariaHidden: element.getAttribute('aria-hidden')
      }));
    const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
    return {
      dialogs,
      button: buttonState,
      audio: audio ? {
        readyState: audio.readyState,
        duration: audio.duration,
        paused: audio.paused,
        ended: audio.ended
      } : null,
      viewportWidth: window.innerWidth
    };
  }, buttonState);
}

test.describe('FoxBear uninterrupted preview translation routing', () => {
  test('keeps one playing audio element while switching studio, phone, laptop, and mono', async ({ page }) => {
    test.setTimeout(75000);
    const temp = createSyntheticWavFiles(1, { seconds: 12, gain: 0.08 });
    try {
      await navigateToApp(page, { disableAutoDialogs: true });
      await expectRuntimeHealthy(expect, page);
      await page.setInputFiles('#fileInput', temp.files);
      const playButton = await waitForStablePreviewPlayControl(page);
      await expect(playButton).toHaveCount(1);
      await expect(playButton).toBeVisible({ timeout: 10000 });
      await expect(playButton).toBeEnabled({ timeout: 10000 });
      const beforePlay = await readPlaybackReadiness(page, playButton);
      expect(beforePlay.dialogs, `blocking dialogs before playback · ${JSON.stringify(beforePlay)}`).toEqual([]);
      expect(beforePlay.button?.disabled, `play button disabled · ${JSON.stringify(beforePlay)}`).toBeFalsy();
      expect(beforePlay.button?.visible, `play button hidden · ${JSON.stringify(beforePlay)}`).toBeTruthy();
      expect(beforePlay.button?.clickTargetOwned, `play button intercepted · ${JSON.stringify(beforePlay)}`).toBeTruthy();
      if (beforePlay.viewportWidth <= 720) {
        expect(beforePlay.button?.className || '', `mobile must use integrated play control · ${JSON.stringify(beforePlay)}`).toContain('dock-integrated-toggle');
      } else {
        expect(beforePlay.button?.id, `desktop must use external play control · ${JSON.stringify(beforePlay)}`).toBe('bottomPreviewPlayBtn');
      }

      await playButton.click({ timeout: 10000 });
      await page.waitForFunction(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        return Boolean(audio && !audio.paused && !audio.ended && audio.currentTime >= 0);
      }, null, { timeout: 10000 });

      const start = await page.evaluate(() => {
        const audio = document.querySelector('#bottomPreviewPlayer audio[data-bottom-preview-active="true"]');
        const originalPlay = audio.play.bind(audio);
        const originalPause = audio.pause.bind(audio);
        const probe = {
          audio,
          playCalls: 0,
          pauseCalls: 0,
          playEvents: 0,
          pauseEvents: 0,
          endedEvents: 0,
          startedAt: audio.currentTime
        };
        audio.play = (...args) => {
          probe.playCalls += 1;
          return originalPlay(...args);
        };
        audio.pause = (...args) => {
          probe.pauseCalls += 1;
          return originalPause(...args);
        };
        audio.addEventListener('play', () => { probe.playEvents += 1; });
        audio.addEventListener('pause', () => { probe.pauseEvents += 1; });
        audio.addEventListener('ended', () => { probe.endedEvents += 1; });
        window.__foxbearTranslationPlaybackProbe = probe;
        return {
          currentTime: audio.currentTime,
          mode: audio._foxbearTranslationController?.mode || null,
          pathCount: Object.keys(audio._foxbearTranslationController?.paths || {}).length
        };
      });
      // Studio mode intentionally stays on the native HTMLMediaElement route.
      // The WebAudio translation controller is attached lazily only after a
      // user selects phone/laptop/mono, avoiding silent playback in WebViews.
      expect(start.mode).toBeNull();
      expect(start.pathCount).toBe(0);

      const stressModes = Array.from({ length: 3 }, () => ['phone', 'laptop', 'mono', 'studio']).flat();
      for (const mode of stressModes) {
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
          playCalls: probe.playCalls,
          pauseCalls: probe.pauseCalls,
          playEvents: probe.playEvents,
          pauseEvents: probe.pauseEvents,
          endedEvents: probe.endedEvents,
          ended: audio.ended,
          mode: audio._foxbearTranslationController?.mode || null,
          contextState: audio._foxbearTranslationController?.context?.state || null,
          pathCount: Object.keys(audio._foxbearTranslationController?.paths || {}).length
        };
      });
      const detail = JSON.stringify(result);
      expect(result.sameAudio, `same audio element · ${detail}`).toBeTruthy();
      expect(result.paused, `playback paused during routing · ${detail}`).toBeFalsy();
      expect(result.ended, `preview ended during routing · ${detail}`).toBeFalsy();
      expect(result.endedEvents, `ended event during routing · ${detail}`).toBe(0);
      expect(result.currentTime, `playhead did not advance · ${detail}`).toBeGreaterThan(result.startedAt + 0.25);
      expect(result.pauseCalls, `routing called audio.pause() · ${detail}`).toBe(0);
      expect(result.playCalls, `routing called audio.play() · ${detail}`).toBe(0);
      expect(result.mode, `final translation mode · ${detail}`).toBe('studio');
      expect(result.contextState, `translation AudioContext closed · ${detail}`).not.toBe('closed');
      expect(result.pathCount, `stale translation paths · ${detail}`).toBe(1);

      const beforeClear = await page.evaluate(() => ({
        playbackLinks: window.FoxBearPlaybackLinkService?.getDiagnostics?.() || null,
        audioContexts: window.FoxBearAudioContextManager?.getDiagnostics?.() || null
      }));
      expect(beforeClear.playbackLinks?.registeredCount || 0).toBeGreaterThan(0);
      await page.locator('#clearBtn').click();
      await page.waitForFunction(() => {
        const links = window.FoxBearPlaybackLinkService?.getDiagnostics?.();
        const contexts = window.FoxBearAudioContextManager?.getDiagnostics?.();
        return document.querySelectorAll('#bottomPreviewPlayer audio').length === 0
          && document.querySelectorAll('#trackList [data-track-id]').length === 0
          && (links?.registeredCount || 0) === 0
          && (contexts?.activeCount || 0) === 0;
      }, null, { timeout: 10000 });
      const afterClear = await page.evaluate(() => ({
        dockHidden: document.querySelector('#bottomPreviewDock')?.getAttribute('aria-hidden'),
        playbackLinks: window.FoxBearPlaybackLinkService?.getDiagnostics?.() || null,
        audioContexts: window.FoxBearAudioContextManager?.getDiagnostics?.() || null
      }));
      expect(afterClear.dockHidden).toBe('true');
      expect(afterClear.playbackLinks?.registeredCount || 0).toBe(0);
      expect(afterClear.audioContexts?.activeCount || 0).toBe(0);
    } finally {
      removeDirSafe(temp.dir);
    }
  });
});
