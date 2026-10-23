const { test, expect } = require('@playwright/test');
const { APP_URL, installOptionalRemoteMocks } = require('./helpers/foxbear-e2e-helpers');

test('first-entry choice fits without scroll on phone, landscape and desktop', async ({ page }) => {
  await installOptionalRemoteMocks(page);
  await page.addInitScript(() => {
    window.__FOXBEAR_E2E__ = true;
    window.__FOXBEAR_SKIP_OPTIONAL_REMOTE__ = true;
    window.__FOXBEAR_E2E_DISABLE_AUTO_DIALOGS__ = true;
  });
  await page.goto(APP_URL, {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#uiModeChooser')).toBeVisible();
  for (const [width, height] of [[320, 480], [320, 568], [390, 667], [390, 844], [568, 320], [844, 390], [768, 1024], [1440, 900]]) {
    await page.setViewportSize({width, height});
    const panel = page.locator('#uiModeChooserPanel');
    const geometry = await panel.evaluate(node => {
      const r = node.getBoundingClientRect();
      return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, scrollTop: node.scrollTop};
    });
    expect(geometry.left, `${width} panel left`).toBeGreaterThanOrEqual(0);
    expect(geometry.right, `${width} panel right`).toBeLessThanOrEqual(width + 1);
    expect(geometry.top, `${height} panel top`).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom, `${height} panel bottom`).toBeLessThanOrEqual(height + 1);
    expect(geometry.scrollWidth - geometry.clientWidth, `${width} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(geometry.scrollHeight - geometry.clientHeight, `${width} vertical overflow`).toBeLessThanOrEqual(1);
    expect(geometry.scrollTop, `${width} panel scroll position`).toBe(0);
    for (const id of ['uiModeAiBtn', 'uiModeExpertBtn']) {
      const card = page.locator('#' + id);
      await card.scrollIntoViewIfNeeded();
      const boxes = await card.evaluate(node => {
        const card = node.getBoundingClientRect();
        const label = node.querySelector('strong').getBoundingClientRect();
        const action = node.querySelector('.ui-mode-choice-action').getBoundingClientRect();
        const copy = node.querySelector('small').getBoundingClientRect();
        return {card: {left: card.left, right: card.right, top: card.top, bottom: card.bottom}, label: {top: label.top, bottom: label.bottom}, action: {left: action.left, right: action.right, top: action.top, bottom: action.bottom}, copy: {top: copy.top, bottom: copy.bottom, visible: getComputedStyle(node.querySelector('small')).display !== 'none'}};
      });
      expect(boxes.card.top, `${height} ${id} top`).toBeGreaterThanOrEqual(geometry.top - 1);
      expect(boxes.card.bottom, `${height} ${id} bottom`).toBeLessThanOrEqual(geometry.bottom + 1);
      expect(boxes.card.left, `${width} ${id} left`).toBeGreaterThanOrEqual(0);
      expect(boxes.card.right, `${width} ${id} right`).toBeLessThanOrEqual(width + 1);
      if (boxes.copy.visible) {
        expect(boxes.label.bottom, `${width} ${id} label/copy`).toBeLessThanOrEqual(boxes.copy.top + 1);
        expect(boxes.copy.bottom, `${width} ${id} copy/action`).toBeLessThanOrEqual(boxes.action.top + 1);
      } else {
        expect(boxes.label.bottom, `${width} ${id} label/action`).toBeLessThanOrEqual(boxes.action.top + 1);
      }
      expect(boxes.action.left, `${width} ${id} action left`).toBeGreaterThanOrEqual(boxes.card.left);
      expect(boxes.action.right, `${width} ${id} action right`).toBeLessThanOrEqual(boxes.card.right + 1);
      expect(boxes.action.bottom, `${width} ${id} action bottom`).toBeLessThanOrEqual(boxes.card.bottom + 1);
    }
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('.entry-signal-live i')).toHaveCSS('animation-name', 'none');
});
