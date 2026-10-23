import postgres from 'postgres'

export function validateTestDatabaseUrl() {
  const value = process.env.E2E_DATABASE_URL
  if (!value)
    throw new Error(
      'E2E_DATABASE_URL must point to a disposable local recipe_e2e or recipe_redesign database.'
    )
  const url = new URL(value)
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !/^\/recipe_(e2e|redesign)(_|$)/.test(url.pathname)
  ) {
    throw new Error(
      'E2E_DATABASE_URL must identify a disposable local test database.'
    )
  }
  return value
}

export function testDatabase() {
  return postgres(validateTestDatabaseUrl(), { max: 1 })
}
