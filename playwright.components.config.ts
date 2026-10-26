import { defineConfig } from '@playwright/test'

const port = Number(process.env.UI_TEST_PORT ?? 18211)
export default defineConfig({
  testDir: './tests/ui',
  testMatch: '*.spec.ts',
  workers: 1,
  outputDir: 'state/ui-consistency/test-results',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: 'only-on-failure',
    trace: 'off'
  },
  webServer: {
    command: `bunx --no-install vite --config tests/ui/vite.config.ts --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false
  }
})
