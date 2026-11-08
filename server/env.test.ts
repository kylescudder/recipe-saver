import { expect, test } from 'bun:test'
import { readDatabaseEnv, readEnv } from '../src/server/env'

const valid = {
  DATABASE_URL: 'postgres://fixture:password@localhost:5432/app',
  CLERK_PUBLISHABLE_KEY: 'public-fixture',
  CLERK_SECRET_KEY: 'secret-fixture',
  APP_ORIGIN: 'https://recipes.example.com'
}

test('valid runtime settings are typed and use the app defaults', () => {
  const env = readEnv(valid)
  expect(env.PORT).toBe(3000)
  expect(env.NODE_ENV).toBe('development')
  expect(readEnv({ ...valid, PORT: '4312' }).PORT).toBe(4312)
})

test('migrations need only a valid PostgreSQL URL', () => {
  expect(
    readDatabaseEnv({ DATABASE_URL: valid.DATABASE_URL }).DATABASE_URL
  ).toBe(valid.DATABASE_URL)
  for (const DATABASE_URL of [
    undefined,
    '',
    'not-a-url',
    'https://example.com/app',
    'postgres://localhost'
  ]) {
    expect(() => readDatabaseEnv({ DATABASE_URL })).toThrow('DATABASE_URL')
  }
})

test('bad listener settings are rejected before accepting requests', () => {
  for (const PORT of ['0', '-1', '65536', '3000.5', 'invalid']) {
    expect(() => readEnv({ ...valid, PORT })).toThrow('PORT')
  }
  expect(() => readEnv({ ...valid, NODE_ENV: 'staging' })).toThrow('NODE_ENV')
})

test('configuration errors identify fields without printing secret values', () => {
  const secret = 'do-not-print-this-password'
  try {
    readEnv({
      ...valid,
      DATABASE_URL: 'https://user:' + secret + '@example.com/app'
    })
    throw new Error('invalid configuration was accepted')
  } catch (error) {
    expect((error as Error).message).toContain('DATABASE_URL')
    expect((error as Error).message).not.toContain(secret)
  }
})

test('missing Clerk credentials fail runtime validation', () => {
  expect(() => readEnv({ ...valid, CLERK_SECRET_KEY: '' })).toThrow(
    'CLERK_SECRET_KEY'
  )
  expect(() => readEnv({ ...valid, CLERK_PUBLISHABLE_KEY: undefined })).toThrow(
    'CLERK_PUBLISHABLE_KEY'
  )
})

test('the application URL must be an HTTP origin without credentials or a path', () => {
  expect(
    readEnv({ ...valid, APP_ORIGIN: 'https://recipes.example.com/' }).APP_ORIGIN
  ).toBe('https://recipes.example.com')
  for (const APP_ORIGIN of [
    'file:///tmp/app',
    'https://user:password@example.com',
    'https://example.com/path',
    'https://example.com/?q=1'
  ]) {
    expect(() => readEnv({ ...valid, APP_ORIGIN })).toThrow('APP_ORIGIN')
  }
})

const better = {
  DATABASE_URL: valid.DATABASE_URL,
  APP_ORIGIN: 'https://recipes.example.com',
  AUTH_PROVIDER: 'better-auth',
  BETTER_AUTH_URL: 'https://recipes.example.com',
  BETTER_AUTH_SECRET:
    'fixture-secret-that-is-longer-than-thirty-two-characters',
  BREVO_API_KEY: 'fixture-api-key',
  AUTH_EMAIL_FROM: 'recipes@example.com',
  AUTH_ALLOWED_EMAILS: 'cook@example.com'
}

test('Clerk stays the default provider', () => {
  expect(readEnv(valid).AUTH_PROVIDER).toBe('clerk')
  expect(readEnv(valid).AUTH_ALLOWED_EMAILS).toEqual([])
  expect(() => readEnv({ ...valid, AUTH_PROVIDER: 'unknown' })).toThrow(
    'AUTH_PROVIDER'
  )
})

test('Better Auth settings are required only when it is selected', () => {
  const env = readEnv(better)
  expect(env.AUTH_PROVIDER).toBe('better-auth')
  expect(env.CLERK_SECRET_KEY).toBeUndefined()
  expect(env.AUTH_EMAIL_DAILY_LIMIT).toBe(40)
  for (const key of [
    'BETTER_AUTH_URL',
    'BETTER_AUTH_SECRET',
    'BREVO_API_KEY',
    'AUTH_EMAIL_FROM',
    'AUTH_ALLOWED_EMAILS'
  ])
    expect(() => readEnv({ ...better, [key]: '' })).toThrow(key)
  expect(() => readEnv({ ...better, BETTER_AUTH_SECRET: 'short' })).toThrow(
    'BETTER_AUTH_SECRET'
  )
  expect(() => readEnv({ ...better, AUTH_EMAIL_DAILY_LIMIT: '301' })).toThrow(
    'AUTH_EMAIL_DAILY_LIMIT'
  )
  expect(() => readEnv({ ...better, AUTH_EMAIL_FROM: 'not-an-email' })).toThrow(
    'AUTH_EMAIL_FROM'
  )
  // Keeping the Clerk keys available supports a configuration rollback.
  expect(
    readEnv({ ...valid, ...better, AUTH_PROVIDER: 'clerk' }).AUTH_PROVIDER
  ).toBe('clerk')
})

test('Better Auth must use the public HTTPS application origin', () => {
  expect(() =>
    readEnv({ ...better, BETTER_AUTH_URL: 'https://other.example.com' })
  ).toThrow('BETTER_AUTH_URL')
  expect(() =>
    readEnv({
      ...better,
      NODE_ENV: 'production',
      APP_ORIGIN: 'http://recipes.example.com',
      BETTER_AUTH_URL: 'http://recipes.example.com'
    })
  ).toThrow('BETTER_AUTH_URL')
  expect(
    readEnv({
      ...better,
      APP_ORIGIN: 'http://localhost:3923',
      BETTER_AUTH_URL: 'http://localhost:3923/'
    }).BETTER_AUTH_URL
  ).toBe('http://localhost:3923')
})

test('allowed emails are validated and normalized', () => {
  expect(
    readEnv({
      ...better,
      AUTH_ALLOWED_EMAILS: ' Cook@Example.com, second@example.com ,'
    }).AUTH_ALLOWED_EMAILS
  ).toEqual(['cook@example.com', 'second@example.com'])
  expect(() =>
    readEnv({ ...better, AUTH_ALLOWED_EMAILS: 'cook@example.com,invalid' })
  ).toThrow('AUTH_ALLOWED_EMAILS')
})
