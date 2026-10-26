import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

for (const width of [1280, 390]) {
  test(`Radix controls, form errors and keyboard focus at ${width}px`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Recipe Saver component checks' })
    ).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const shot = async (name: string) => {
      if (!process.env.UI_EVIDENCE_DIR) return
      await mkdir(process.env.UI_EVIDENCE_DIR, { recursive: true })
      await page.screenshot({
        path: `${process.env.UI_EVIDENCE_DIR}/${name}-${width}.png`,
        fullPage: true,
        animations: 'disabled'
      })
    }
    await expect(
      page.getByRole('link', { name: 'Slotted link' })
    ).toHaveAttribute('href', '#controls')
    const trigger = page.getByRole('button', { name: 'Open dialog' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Recipe details' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveCSS('position', 'fixed')
    await dialog.getByRole('button', { name: 'Validate name' }).click()
    await expect(dialog.getByText('Enter a recipe name.')).toBeVisible()
    await dialog.getByLabel('Recipe name').fill('Test pasta')
    await dialog.getByRole('button', { name: 'Validate name' }).click()
    await expect(dialog.getByRole('status')).toHaveText(
      'Valid name: Test pasta'
    )
    await shot('dialog')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(
      page.getByRole('menuitem', { name: 'Archive recipe' })
    ).toBeVisible()
    await shot('menu')
    await page.getByRole('menuitem', { name: 'Archive recipe' }).click()
    await expect(
      page.getByText('Selection: Archived', { exact: true })
    ).toBeVisible()
    await page.getByRole('combobox', { name: 'Recipe source' }).click()
    await page.getByRole('option', { name: 'Cookbook', exact: true }).click()
    await expect(
      page.getByRole('combobox', { name: 'Recipe source' })
    ).toContainText('Cookbook')
    await page.getByRole('radio', { name: 'A website' }).focus()
    await page.keyboard.down('ArrowDown')
    try {
      await expect(
        page.getByRole('radio', { name: 'A cookbook' })
      ).toBeChecked()
    } finally {
      await page.keyboard.up('ArrowDown')
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
    expect(errors).toEqual([])
  })
}
