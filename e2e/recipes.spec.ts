import { test, expect, type Page } from '@playwright/test'
import { testDatabase } from './database'

async function openRecipe(page: Page) {
  await page.getByRole('button', { name: 'Add recipe', exact: true }).click()
  return page.getByRole('dialog', { name: 'Add a recipe' })
}
const unique = () => `Test ${Date.now()}`

for (const width of [1280, 390]) {
  test(`website and cookbook save, validation, search and archive at ${width}px`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    const title = unique()
    let dialog = await openRecipe(page)
    await dialog.getByRole('button', { name: 'Save recipe' }).click()
    await expect(dialog.getByText('Give your recipe a name.')).toBeVisible()
    await dialog.getByLabel('Recipe name').fill(`${title} website`)
    await dialog.getByLabel('Recipe link').fill('javascript:alert(1)')
    await dialog.getByRole('button', { name: 'Save recipe' }).click()
    await expect(
      dialog.getByText('Use a full http or https website link.')
    ).toBeVisible()
    await dialog
      .getByLabel('Recipe link')
      .fill('https://www.bbcgoodfood.com/recipes/easy-vegan-pancakes')
    await dialog.getByRole('button', { name: 'Save recipe' }).click()
    await expect(dialog).not.toBeVisible()
    const search = page.getByRole('searchbox', { name: 'Search recipes' })
    await search.fill(title)
    await expect(
      page.getByRole('cell', { name: `${title} website`, exact: true })
    ).toBeVisible()
    const link = page.getByRole('link', { name: /bbcgoodfood.com/ }).first()
    await expect(link).toHaveAttribute(
      'href',
      'https://www.bbcgoodfood.com/recipes/easy-vegan-pancakes'
    )
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    await page.reload()
    await search.fill(title)
    await expect(
      page.getByRole('cell', { name: `${title} website`, exact: true })
    ).toBeVisible()
    dialog = await openRecipe(page)
    // Switch after a website validation failure to catch stale hidden-field validation.
    await dialog.getByRole('button', { name: 'Save recipe' }).click()
    await dialog.getByRole('radio', { name: 'A cookbook' }).click()
    await dialog.getByLabel('Recipe name').fill(`${title} cookbook`)
    await dialog.getByRole('button', { name: 'Save recipe' }).click()
    await expect(
      dialog.getByText('Add the name of your cookbook.')
    ).toBeVisible()
    await dialog.getByLabel('Cookbook title').fill('The Green Roasting Tin')
    await dialog.getByLabel('Page', { exact: false }).fill('42')
    await dialog.getByRole('button', { name: 'Save recipe' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('The Green Roasting Tin')).toBeVisible()
    await expect(page.getByText('Page 42', { exact: true })).toBeVisible()
    await page.reload()
    await search.fill(title)
    await expect(
      page.getByRole('cell', { name: `${title} cookbook`, exact: true })
    ).toBeVisible()
    await search.fill('no such recipe xyz')
    await expect(
      page.getByRole('heading', { name: 'No recipe by that name.' })
    ).toBeVisible()
    await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
    await page
      .getByRole('button', { name: 'Clear search', exact: true })
      .last()
      .click()
    await search.fill(title)
    for (const suffix of ['website', 'cookbook']) {
      await page
        .getByRole('button', {
          name: `Options for ${title} ${suffix}`,
          exact: true
        })
        .click()
      await page.getByRole('menuitem', { name: 'Archive recipe' }).click()
      await expect(
        page.getByRole('cell', { name: `${title} ${suffix}`, exact: true })
      ).not.toBeVisible()
    }
    await page.reload()
    await search.fill(title)
    await expect(
      page.getByRole('heading', { name: 'No recipe by that name.' })
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
    expect(errors).toEqual([])
  })
}

test('source sorting, column visibility, pagination and appearance', async ({
  page
}) => {
  const sql = testDatabase()
  const fixtures = Array.from({ length: 12 }, (_, i) => ({
    id: `e2e-sort-${i}`,
    name: `Sort fixture ${String(i).padStart(2, '0')}`,
    book: `${String(12 - i).padStart(2, '0')} cookbook`
  }))
  try {
    await sql`DELETE FROM recipes WHERE id LIKE 'e2e-sort-%'`
    for (const fixture of fixtures)
      await sql`INSERT INTO recipes (id, recipe_name, recipe_link, recipe_book, recipe_page_no, archive) VALUES (${fixture.id}, ${fixture.name}, '', ${fixture.book}, '42', false)`
    await page.goto('/')
    await page
      .getByRole('searchbox', { name: 'Search recipes' })
      .fill('Sort fixture')
    await expect(page.locator('tbody tr')).toHaveCount(10)
    await page.getByRole('button', { name: 'Go to next page' }).click()
    await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(2)
    await page.getByRole('button', { name: 'Go to previous page' }).click()

    await page.getByRole('button', { name: 'Source', exact: true }).click()
    await page.getByRole('menuitem', { name: 'A to Z' }).click()
    await expect(
      page.getByRole('columnheader', { name: 'Source' })
    ).toHaveAttribute('aria-sort', 'ascending')
    await expect(page.locator('tbody tr').first()).toContainText('01 cookbook')
    await expect(page.locator('tbody tr').first()).toContainText(
      'Sort fixture 11'
    )
    await page.getByRole('button', { name: 'View', exact: true }).click()
    await page
      .getByRole('menuitemcheckbox', { name: 'Source', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('columnheader', { name: 'Source' })
    ).not.toBeVisible()
    await page.getByRole('button', { name: 'View', exact: true }).click()
    await page
      .getByRole('menuitemcheckbox', { name: 'Source', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('columnheader', { name: 'Source' })
    ).toBeVisible()
    await page.getByRole('combobox', { name: 'Rows per page' }).click()
    await page.getByRole('option', { name: '20', exact: true }).click()
    await expect(
      page.getByRole('combobox', { name: 'Rows per page' })
    ).toContainText('20')
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await page.getByRole('menuitem', { name: 'Dark', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await page.getByRole('menuitem', { name: 'Light', exact: true }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  } finally {
    await sql`DELETE FROM recipes WHERE id LIKE 'e2e-sort-%'`
    await sql.end()
  }
})

test('keyboard dialog dismissal returns focus to the add button', async ({
  page
}) => {
  await page.goto('/')
  const dialog = await openRecipe(page)
  await expect(dialog.getByLabel('Recipe name')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add recipe', exact: true })
  ).toBeFocused()
})

test('signed-out access redirects to Clerk sign-in', async ({
  browser,
  baseURL
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] }
  })
  const page = await context.newPage()
  await page.goto(baseURL + '/recipes')
  await expect(page).toHaveURL(/sign-in/)
  await expect(
    page.getByRole('heading', { name: 'Open your recipe book.' })
  ).toBeVisible()
  await expect(
    page.getByRole('searchbox', { name: 'Search recipes' })
  ).not.toBeVisible()
  await context.close()
})

test('failed save and archive keep the recipe available to retry', async ({
  page
}) => {
  const name = unique() + ' retry'
  await page.goto('/')
  const dialog = await openRecipe(page)
  await dialog.getByLabel('Recipe name').fill(name)
  await dialog.getByLabel('Recipe link').fill('https://example.com/retry')
  await page.route('**/api/trpc/recipes.save*', (route) =>
    route.abort('failed')
  )
  await dialog.getByRole('button', { name: 'Save recipe' }).click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Your recipe could not be saved.'
  )
  await expect(dialog.getByLabel('Recipe name')).toHaveValue(name)
  await page.unroute('**/api/trpc/recipes.save*')
  await dialog.getByRole('button', { name: 'Save recipe' }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('searchbox', { name: 'Search recipes' }).fill(name)
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
  await page.route('**/api/trpc/recipes.archive*', (route) =>
    route.abort('failed')
  )
  await page.getByRole('button', { name: `Options for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Archive recipe' }).click()
  await expect(
    page.getByText('Could not archive recipe. Please try again.')
  ).toBeVisible()
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
  await page.unroute('**/api/trpc/recipes.archive*')
  await page.getByRole('button', { name: `Options for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Archive recipe' }).click()
  await expect(page.getByRole('cell', { name, exact: true })).not.toBeVisible()
})

test('the index recovers from a failed load', async ({ page }) => {
  await page.route('**/api/trpc/recipes.list*', (route) =>
    route.abort('failed')
  )
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'We couldn’t open the index.' })
  ).toBeVisible()
  await page.unroute('**/api/trpc/recipes.list*')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('table', { name: 'Saved recipes' })).toBeVisible()
})

test('an empty collection invites a first recipe and never shows page zero', async ({
  page
}) => {
  const sql = testDatabase()
  try {
    await sql`DELETE FROM recipes`
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'The first page is yours.' })
    ).toBeVisible()
    await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Go to next page' })
    ).toBeDisabled()
    await page.getByRole('button', { name: 'Add your first recipe' }).click()
    await expect(
      page.getByRole('dialog', { name: 'Add a recipe' })
    ).toBeVisible()
  } finally {
    await sql.end()
  }
})
