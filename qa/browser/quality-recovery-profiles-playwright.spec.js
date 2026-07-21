'use strict';

const { test, expect } = require('@playwright/test');
const {
  createSyntheticWavFiles,
  expectRuntimeHealthy,
  navigateToApp,
  removeDirSafe
} = require('./helpers/foxbear-e2e-helpers');

async function importAndMasterWithRecovery(page, filePath, control) {
  await navigateToApp(page, { disableAutoDialogs: true });
  await expectRuntimeHealthy(expect, page);
  await page.evaluate(value => { window.__FOXBEAR_E2E_QUALITY_RECOVERY__ = value; }, control);
  await page.setInputFiles('#fileInput', filePath);
  await page.waitForFunction(() => {
    const queue = window.FoxBearBulkImportGuard?.getSnapshot?.();
    const button = document.getElementById('masterSelectedBtn');
    return Boolean(queue && queue.active === 0 && queue.pending === 0 && button && !button.disabled);
  }, null, { timeout: 30000 });
  await page.locator('#masterSelectedBtn').click({ timeout: 10000 });
  await page.waitForFunction(() => {
    const selected = window.FoxBearMasteringDiagnostics?.getSnapshot?.()?.selected;
    return Boolean(selected && selected.status === 'done' && selected.recoveryStatus && selected.outputBytes > 44);
  }, null, { timeout: 90000 });
  return page.evaluate(() => window.FoxBearMasteringDiagnostics.getSnapshot().selected);
}

test.describe('FoxBear risk-specific quality recovery', () => {
  test('rerenders once with a phase profile and preserves the first render after an injected recovery exception', async ({ page }) => {
    test.setTimeout(180000);
    const fixture = createSyntheticWavFiles(1, { seconds: 2.5, sampleRate: 16000, gain: 0.08 });
    try {
      const recovered = await importAndMasterWithRecovery(page, fixture.files[0], {
        forceFirstGateFail: true,
        riskCode: 'PHASE_RISK'
      });
      expect(recovered.recoveryStatus, JSON.stringify(recovered)).toBe('recovered');
      expect(recovered.recoveryProfileId, JSON.stringify(recovered)).toBe('phase-stabilization');
      expect(recovered.recoveryRiskCodes, JSON.stringify(recovered)).toContain('PHASE_RISK');
      expect(recovered.preservedFirstRender, JSON.stringify(recovered)).toBeFalsy();
      expect(recovered.outputBytes, JSON.stringify(recovered)).toBeGreaterThan(44);
      expect(recovered.stages.some(stage => stage.label === '안전 재렌더'), JSON.stringify(recovered)).toBeTruthy();

      await page.goto('about:blank');
      const preserved = await importAndMasterWithRecovery(page, fixture.files[0], {
        forceFirstGateFail: true,
        riskCode: 'HIGH_LOSS',
        throwAt: 'after-render'
      });
      expect(preserved.recoveryStatus, JSON.stringify(preserved)).toBe('error');
      expect(preserved.recoveryProfileId, JSON.stringify(preserved)).toBe('spectral-preservation');
      expect(preserved.recoveryRiskCodes, JSON.stringify(preserved)).toContain('HIGH_LOSS');
      expect(preserved.preservedFirstRender, JSON.stringify(preserved)).toBeTruthy();
      expect(preserved.recoveryError, JSON.stringify(preserved)).toContain('E2E injected quality recovery error at after-render');
      expect(preserved.outputBytes, JSON.stringify(preserved)).toBeGreaterThan(44);
      expect(preserved.qualityGate, JSON.stringify(preserved)).toBe('fail');
    } finally {
      removeDirSafe(fixture.dir);
    }
  });
});
