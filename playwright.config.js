// @ts-check
'use strict';

function loadPlaywrightHelpers(loadModule = require) {
  try {
    return loadModule('@playwright/test');
  } catch (error) {
    const missingPlaywright = error?.code === 'MODULE_NOT_FOUND'
      && String(error?.message || '').includes('@playwright/test');
    if (!missingPlaywright) throw error;

    // Static release probes inspect this config before development dependencies
    // are installed. Keep those probes import-safe while preserving the real
    // Playwright device descriptors whenever @playwright/test is available.
    return {
      defineConfig: config => config,
      devices: {
        'Desktop Chrome': {
          browserName: 'chromium',
          viewport: { width: 1280, height: 720 },
          screen: { width: 1920, height: 1080 },
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false
        },
        'Pixel 5': {
          browserName: 'chromium',
          viewport: { width: 393, height: 727 },
          screen: { width: 393, height: 851 },
          deviceScaleFactor: 2.75,
          isMobile: true,
          hasTouch: true,
          userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        }
      }
    };
  }
}

const { defineConfig, devices } = loadPlaywrightHelpers();

const baseURL = process.env.FOXBEAR_E2E_URL || 'http://127.0.0.1:4173';
const systemChromium = process.env.FOXBEAR_CHROMIUM_PATH || undefined;

module.exports = defineConfig({
  testDir: './qa/browser',
  timeout: 60000,
  expect: { timeout: 10000 },
  navigationTimeout: 20000,
  fullyParallel: false,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa/browser-results/results.json' }]
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: systemChromium ? 'off' : 'retain-on-failure',
    ...(systemChromium ? { launchOptions: { executablePath: systemChromium } } : {})
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } }
    },
    {
      name: 'chromium-mobile-pwa',
      use: { ...devices['Pixel 5'] }
    }
  ],
  outputDir: 'qa/browser-results'
});
