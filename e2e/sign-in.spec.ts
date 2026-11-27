import { test, expect } from '@playwright/test'

// Sign-in is served by Better Auth. A rejected password must not start a
// session: the signed-out user stays on the sign-in page and the recipe index
// stays unreachable.
test('a wrong password is rejected and does not open the recipe index', async ({
  browser,
  baseURL
}) => {
  const email = process.env.E2E_USERNAME
  if (!email) throw new Error('E2E_USERNAME is required')
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] }
  })
  const page = await context.newPage()
  await page.goto(baseURL + '/sign-in')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill('not-the-password-' + Date.now())
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/sign-in/)
  await expect(
    page.getByRole('heading', { name: 'Your recipe index' })
  ).not.toBeVisible()
  await page.goto(baseURL + '/recipes')
  await expect(page).toHaveURL(/sign-in/)
  await context.close()
})
