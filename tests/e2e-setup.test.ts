import { afterAll, afterEach, expect, spyOn, test } from 'bun:test'
import { chromium, type FullConfig } from '@playwright/test'
import setup from '../e2e/setup'

const originalEnv = {
  E2E_DATABASE_URL: process.env.E2E_DATABASE_URL,
  E2E_USERNAME: process.env.E2E_USERNAME,
  E2E_PASSWORD: process.env.E2E_PASSWORD
}
const config = {
  projects: [{ use: { baseURL: 'http://localhost:5174' } }]
} as unknown as FullConfig

const launch = spyOn(chromium, 'launch').mockImplementation(() => {
  throw new Error('Browser launched before database validation')
})

afterAll(() => launch.mockRestore())

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  launch.mockClear()
})

test('missing disposable database rejects setup before launching a browser', async () => {
  delete process.env.E2E_DATABASE_URL
  process.env.E2E_USERNAME = 'unused-test-login'
  process.env.E2E_PASSWORD = 'unused-test-password'
  await expect(setup(config)).rejects.toThrow('E2E_DATABASE_URL')
  expect(launch).not.toHaveBeenCalled()
})

test.each([
  ['empty', ''],
  ['remote host', 'postgres://postgres@database.example/recipe_e2e_setup'],
  ['non-disposable database', 'postgres://postgres@localhost/production'],
  ['malformed URL', 'not-a-database-url'],
  ['non-PostgreSQL URL', 'https://localhost/recipe_e2e_setup']
])(
  'invalid database (%s) rejects setup before launching a browser',
  async (_label, value) => {
    process.env.E2E_DATABASE_URL = value
    process.env.E2E_USERNAME = 'unused-test-login'
    process.env.E2E_PASSWORD = 'unused-test-password'
    await expect(setup(config)).rejects.toThrow()
    expect(launch).not.toHaveBeenCalled()
  }
)
