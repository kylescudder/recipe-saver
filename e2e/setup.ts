import { chromium, expect, type FullConfig } from '@playwright/test'
import { mkdir, chmod } from 'node:fs/promises'
import { validateTestDatabaseUrl } from './database'

export default async function setup(config: FullConfig) {
  validateTestDatabaseUrl()
  const baseURL = config.projects[0].use.baseURL!
  if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
    throw new Error('E2E verification requires a local disposable environment.')
  }
  const username = process.env.E2E_USERNAME
  const password = process.env.E2E_PASSWORD
  if (!username || !password)
    throw new Error(
      'Set E2E_USERNAME and E2E_PASSWORD to an existing Clerk DEV test login.'
    )
  await mkdir('state/design-overhaul', { recursive: true })
  // Login has no tracing or screenshots: credentials never enter test artifacts.
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(baseURL)
    await page.waitForURL(/sign-in/)
    await page.locator('#identifier-field').fill(username)
    await page.locator('#password-field').fill(password)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
      timeout: 30000
    })
    if (new URL(page.url()).pathname === '/onboarding') {
      await page.getByLabel('Name', { exact: true }).fill('Test Cook')
      await page.getByLabel('Username', { exact: true }).fill('test-cook')
      await page
        .getByLabel('Bio', { exact: true })
        .fill('Local verification profile')
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
    await expect(
      page.getByRole('heading', { name: 'Your recipe index' })
    ).toBeVisible()
    await page
      .context()
      .storageState({ path: 'state/design-overhaul/auth.json' })
    await chmod('state/design-overhaul/auth.json', 0o600)
  } finally {
    await browser.close()
  }
}
