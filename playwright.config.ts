import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  outputDir: 'state/design-overhaul/test-results',
  reporter: [
    ['list'],
    [
      'html',
      { outputFolder: 'state/design-overhaul/playwright-report', open: 'never' }
    ]
  ],
  globalSetup: './e2e/setup.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    storageState: 'state/design-overhaul/auth.json',
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    // Authenticated network traces can contain session credentials.
    trace: 'off'
  }
})
