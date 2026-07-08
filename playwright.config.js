// @ts-check
'use strict';

const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.FOXBEAR_E2E_URL || 'http://127.0.0.1:4173';

module.exports = defineConfig({
  testDir: './qa/browser',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
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
