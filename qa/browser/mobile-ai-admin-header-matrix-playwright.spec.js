const { test, expect } = require('@playwright/test');
const { navigateToApp } = require('./helpers/foxbear-e2e-helpers');

async function readHeaderState(page) {
  return page.evaluate(() => {
    const left = document.querySelector('.brand-command-left');
    const actions = document.querySelector('.brand-right-actions');
    const device = document.querySelector('.brand-command-device');
    const icons = document.querySelector('.brand-command-device-icons');
    const admin = document.getElementById('adminStatsTrigger');
    if (!left || !actions || !device || !icons || !admin) return null;
    const l = left.getBoundingClientRect();
    const a = actions.getBoundingClientRect();
    const d = device.getBoundingClientRect();
    const i = icons.getBoundingClientRect();
    const m = admin.getBoundingClientRect();
    return {
      width: innerWidth,
      mode: document.body.dataset.uiMode || '',
      overlap: Math.max(0, l.right - a.left),
      leftOverflow: Math.max(0, left.scrollWidth - left.clientWidth),
      deviceDisplay: getComputedStyle(device).display,
      iconsDisplay: getComputedStyle(icons).display,
      iconsWidth: i.width,
      deviceWidth: d.width,
      adminDisplay: getComputedStyle(admin).display,
      adminWidth: m.width,
      actionsRight: a.right
    };
  });
}

test('mobile AI/admin header keeps compatibility glyph without rail overlap', async ({ page }) => {
  await navigateToApp(page);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 760 });
    await page.evaluate(() => {
      document.body.dataset.uiMode = 'ai';
      const admin = document.getElementById('adminStatsTrigger');
      admin.hidden = false;
      admin.setAttribute('aria-hidden', 'false');
    });
    await page.waitForTimeout(60);
    const state = await readHeaderState(page);
    expect(state).not.toBeNull();
    expect(state.mode).toBe('ai');
    expect(['flex', 'inline-flex']).toContain(state.iconsDisplay);
    expect(state.iconsWidth, `${width}px compatibility glyph disappeared · ${JSON.stringify(state)}`).toBeGreaterThan(8);
    expect(state.deviceWidth).toBeGreaterThan(8);
    expect(state.adminDisplay).not.toBe('none');
    expect(state.adminWidth).toBeGreaterThan(20);
    expect(state.overlap, `${width}px AI/admin header overlap · ${JSON.stringify(state)}`).toBeLessThanOrEqual(1);
    expect(state.leftOverflow, `${width}px AI/admin left rail overflow · ${JSON.stringify(state)}`).toBeLessThanOrEqual(2);
    expect(state.actionsRight).toBeLessThanOrEqual(width + 1);
  }
});
