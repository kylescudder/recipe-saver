import { defineConfig } from '@playwright/test'

// `bun run test:e2e` (e2e/run.ts) sets E2E_PORT and a throwaway database, and
// Playwright starts the production server here. Setting E2E_BASE_URL without
// E2E_PORT targets a server you started yourself instead.
const port = process.env.E2E_PORT

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
  webServer: port
    ? {
        command: 'bun run start',
        url: `http://localhost:${port}/healthz`,
        reuseExistingServer: false,
        timeout: 60000
      }
    : undefined,
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
