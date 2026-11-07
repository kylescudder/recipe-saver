// Better Auth against a disposable PostgreSQL database. Clerk is untouched.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import postgres from 'postgres'
import { database, migrate, orm, type Database } from '../src/server/db'
import {
  betterAuthIdentity,
  createRecipeSaverAuth
} from '../src/server/auth-factory'
import { createTrpcHandler } from '../src/server/trpc-handler'
import { createApp } from './app'

if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    'TEST_DATABASE_URL must identify a disposable test PostgreSQL service'
  )
const admin = postgres(process.env.TEST_DATABASE_URL, {
  max: 1,
  onnotice: () => {}
})
const name = 'recipe_auth_' + randomUUID().replaceAll('-', '').slice(0, 10)
const ownerName = name + '_owner'
const runtimeName = name + '_runtime'
const created: string[] = []
const clients: Database[] = []
let owner: Database
let runtime: Database
const origin = 'https://recipes.auth.test'
const allowed = ['cook@example.com', 'second@example.com']
const secret = randomUUID() + randomUUID()
const envKeys = [
  'APP_ORIGIN',
  'DATABASE_URL',
  'AUTH_PROVIDER',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'BREVO_API_KEY',
  'AUTH_EMAIL_FROM',
  'AUTH_ALLOWED_EMAILS'
]
const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]])
)
let preserved: { before: unknown; after: unknown }

function databaseUrl(user: string) {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  url.username = user
  url.password = ''
  url.pathname = '/' + name
  return url.toString()
}
function client(user: string, max = 4) {
  const sql = database(databaseUrl(user), max)
  clients.push(sql)
  return sql
}

beforeAll(async () => {
  for (const role of [ownerName, runtimeName]) {
    await admin.unsafe(
      `CREATE ROLE "${role}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`
    )
    created.push(role)
  }
  await admin.unsafe(`CREATE DATABASE "${name}" OWNER "${ownerName}"`)
  created.push(name)
  await admin.unsafe(`REVOKE ALL ON DATABASE "${name}" FROM PUBLIC`)
  await admin.unsafe(`GRANT CONNECT ON DATABASE "${name}" TO "${runtimeName}"`)
  owner = client(ownerName, 1)
  await owner.unsafe(`REVOKE ALL ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO "${runtimeName}";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${runtimeName}";`)
  // Production already has the baseline and shared recipes. Adding auth must
  // leave them exactly as they were.
  await owner.unsafe(
    await Bun.file(
      new URL('../drizzle/0000_baseline.sql', import.meta.url)
    ).text()
  )
  await owner`INSERT INTO recipes (id, recipe_name, recipe_book, recipe_page_no)
    VALUES ('existing-recipe', 'Grandma''s soup', 'The family book', '12')`
  const snapshot = async () =>
    (
      await owner`SELECT row_to_json(r) AS row FROM recipes r WHERE id = 'existing-recipe'`
    )[0]?.row
  const before = await snapshot()
  await owner.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle;
    CREATE TABLE drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`)
  const journal = await Bun.file(
    new URL('../drizzle/meta/_journal.json', import.meta.url)
  ).json()
  // Record the baseline as applied, as on the production database.
  const baseline = new Bun.CryptoHasher('sha256')
    .update(
      await Bun.file(
        new URL('../drizzle/0000_baseline.sql', import.meta.url)
      ).text()
    )
    .digest('hex')
  await owner`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${baseline}, ${journal.entries[0].when})`
  await migrate(owner)
  preserved = { before, after: await snapshot() }
  runtime = client(runtimeName)
})

afterAll(async () => {
  await Promise.all(clients.map((sql) => sql.end({ timeout: 1 })))
  if (created.includes(name))
    await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`)
  for (const role of [runtimeName, ownerName])
    if (created.includes(role)) await admin.unsafe(`DROP ROLE "${role}"`)
  await admin.end({ timeout: 1 })
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

let fixtureNumber = 0
async function authFixture(dailyEmailLimit = 40) {
  for (const table of [
    'auth_user',
    'auth_verification',
    'auth_rate_limit',
    'auth_email_limit'
  ])
    await owner.unsafe(`DELETE FROM ${table}`)
  const sent = new Map<string, string>()
  const links: { email: string; kind: string; url: string }[] = []
  const db = orm(runtime)
  const settings = {
    baseURL: origin,
    secret,
    allowedEmails: allowed,
    dailyEmailLimit
  }
  const auth = createRecipeSaverAuth(
    db,
    settings,
    async (email, otp) => {
      sent.set(email, otp)
    },
    async (email, kind, url) => {
      links.push({ email, kind, url })
    }
  )
  const ip = `203.0.113.${++fixtureNumber}`
  function request(
    path: string,
    body?: unknown,
    cookie = '',
    extra: Record<string, string> = {}
  ) {
    return auth.handler(
      new Request(origin + '/api/auth' + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          'CF-Connecting-IP': ip,
          Cookie: cookie,
          ...extra
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      })
    )
  }
  return { auth, request, sent, links, settings, db }
}

function mergeCookies(response: Response, prior = '') {
  const values = new Map(
    prior
      .split('; ')
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=')
        return [part.slice(0, index), part.slice(index + 1)]
      })
  )
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0]!
    const index = pair.indexOf('=')
    values.set(pair.slice(0, index), pair.slice(index + 1))
  }
  return [...values].map(([key, value]) => key + '=' + value).join('; ')
}

async function signIn(
  fixture: Awaited<ReturnType<typeof authFixture>>,
  email = 'cook@example.com'
) {
  const sent = await fixture.request('/email-otp/send-verification-otp', {
    email,
    type: 'sign-in'
  })
  expect(sent.status).toBe(200)
  const response = await fixture.request('/sign-in/email-otp', {
    email,
    otp: fixture.sent.get(email)
  })
  expect(response.status).toBe(200)
  return {
    cookie: mergeCookies(response),
    user: (await response.clone().json()).user as {
      id: string
      email: string
      emailVerified: boolean
    }
  }
}

function recipesApp(fixture: Awaited<ReturnType<typeof authFixture>>) {
  const trpc = createTrpcHandler(
    fixture.db,
    betterAuthIdentity(fixture.auth, allowed)
  )
  return (cookie: string) =>
    trpc(
      new Request(origin + '/api/trpc/recipes.list', {
        headers: { Cookie: cookie }
      })
    )
}

test('adding Better Auth is additive and preserves existing recipes', async () => {
  expect(preserved.after).toEqual(preserved.before)
  expect(preserved.after).toMatchObject({ recipe_name: "Grandma's soup" })
  const tables = await owner`SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`
  expect(tables.map((row) => row.table_name)).toEqual([
    'auth_account',
    'auth_email_limit',
    'auth_passkey',
    'auth_rate_limit',
    'auth_session',
    'auth_user',
    'auth_verification',
    'recipes'
  ])
  const columns = await owner`SELECT column_name FROM information_schema.columns
    WHERE table_name = 'recipes' ORDER BY column_name`
  expect(columns.map((row) => row.column_name)).toEqual([
    'archive',
    'id',
    'recipe_book',
    'recipe_link',
    'recipe_name',
    'recipe_page_no'
  ])
})

test('email codes go only to invited emails, are hashed and single-use, and open the shared collection', async () => {
  const fixture = await authFixture()
  const outsider = await fixture.request('/email-otp/send-verification-otp', {
    email: 'outsider@example.com',
    type: 'sign-in'
  })
  expect(outsider.status).toBe(200)
  expect(await outsider.json()).toEqual({ success: true })
  expect(fixture.sent.size).toBe(0)
  expect((await owner`SELECT id FROM auth_verification`).length).toBe(0)
  expect((await owner`SELECT key FROM auth_email_limit`).length).toBe(0)

  const sent = await fixture.request('/email-otp/send-verification-otp', {
    email: ' COOK@example.com ',
    type: 'sign-in'
  })
  expect(sent.status).toBe(200)
  expect(await sent.json()).toEqual({ success: true })
  const otp = fixture.sent.get('cook@example.com')!
  expect(otp).toMatch(/^\d{6}$/)
  const [stored] = await owner`SELECT identifier, value FROM auth_verification`
  expect(stored.identifier).toBe('sign-in-otp-cook@example.com')
  const expected = new Bun.CryptoHasher('sha256', secret)
    .update('recipe-saver-email-otp:' + otp)
    .digest('hex')
  expect(stored.value).toBe(expected + ':0')

  // Per-recipient cooldown: one email a minute, previous code still valid.
  const again = await fixture.request('/email-otp/send-verification-otp', {
    email: 'cook@example.com',
    type: 'sign-in'
  })
  expect(again.status).toBe(429)
  expect(fixture.sent.get('cook@example.com')).toBe(otp)

  const wrong = otp === '000000' ? '111111' : '000000'
  expect(
    (
      await fixture.request('/sign-in/email-otp', {
        email: 'cook@example.com',
        otp: wrong
      })
    ).status
  ).toBe(400)
  const signedIn = await fixture.request('/sign-in/email-otp', {
    email: 'cook@example.com',
    otp
  })
  expect(signedIn.status).toBe(200)
  expect((await signedIn.clone().json()).user.emailVerified).toBe(true)
  const cookies = signedIn.headers.getSetCookie().join(';')
  expect(cookies).toContain('recipe-saver-auth.session_token')
  expect(cookies).toMatch(/HttpOnly/i)
  expect(cookies).toMatch(/Secure/i)
  expect(cookies).toMatch(/SameSite=Lax/i)
  expect(cookies).not.toMatch(/Domain=/i)
  const cookie = mergeCookies(signedIn)
  const list = recipesApp(fixture)
  const recipes = await list(cookie)
  expect(recipes.status).toBe(200)
  expect(
    (await recipes.json()).result.data.map(
      (recipe: { _id: string }) => recipe._id
    )
  ).toContain('existing-recipe')
  expect((await list('')).status).toBe(401)
  // Codes are single-use.
  expect(
    (
      await fixture.request('/sign-in/email-otp', {
        email: 'cook@example.com',
        otp
      })
    ).status
  ).toBe(400)
  expect((await fixture.request('/sign-out', {}, cookie)).status).toBe(200)
  expect((await list(cookie)).status).toBe(401)
})

test('cross-site requests, other OTP types and exhausted attempts are refused', async () => {
  const fixture = await authFixture()
  for (const headers of [
    { Origin: 'https://evil.example' },
    { Origin: origin, 'Sec-Fetch-Site': 'cross-site' }
  ])
    expect(
      (
        await fixture.request(
          '/email-otp/send-verification-otp',
          { email: 'cook@example.com', type: 'sign-in' },
          '',
          headers
        )
      ).status
    ).toBe(403)
  expect(
    (
      await fixture.request('/email-otp/send-verification-otp', {
        email: 'cook@example.com',
        type: 'email-verification'
      })
    ).status
  ).toBe(400)
  expect(fixture.sent.size).toBe(0)
  // Those three requests used this address's per-IP send allowance.
  await owner`DELETE FROM auth_rate_limit`
  await fixture.request('/email-otp/send-verification-otp', {
    email: 'cook@example.com',
    type: 'sign-in'
  })
  const otp = fixture.sent.get('cook@example.com')!
  const wrong = otp === '000000' ? '111111' : '000000'
  for (let attempt = 0; attempt < 5; attempt++)
    await fixture.request('/sign-in/email-otp', {
      email: 'cook@example.com',
      otp: wrong
    })
  const exhausted = await fixture.request('/sign-in/email-otp', {
    email: 'cook@example.com',
    otp
  })
  expect(exhausted.status).toBe(403)
  expect((await owner`SELECT id FROM auth_user`).length).toBe(0)
})

test('the app-wide daily email budget is shared and atomic', async () => {
  const fixture = await authFixture(1)
  const responses = await Promise.all(
    Array.from({ length: 4 }, () =>
      fixture.request('/email-otp/send-verification-otp', {
        email: 'cook@example.com',
        type: 'sign-in'
      })
    )
  )
  expect(responses.filter((r) => r.status === 200).length).toBe(1)
  expect(responses.filter((r) => r.status === 429).length).toBe(3)
  expect(
    (
      await fixture.request('/email-otp/send-verification-otp', {
        email: 'second@example.com',
        type: 'sign-in'
      })
    ).status
  ).toBe(429)
  expect(fixture.sent.size).toBe(1)
})

test('unverified or uninvited accounts cannot read recipes or enroll passkeys', async () => {
  const fixture = await authFixture()
  const { cookie, user } = await signIn(fixture)
  const list = recipesApp(fixture)
  expect((await list(cookie)).status).toBe(200)
  await owner`UPDATE auth_user SET email_verified = false WHERE id = ${user.id}`
  expect((await list(cookie)).status).toBe(401)
  expect(
    (
      await fixture.request(
        '/passkey/generate-register-options',
        undefined,
        cookie
      )
    ).status
  ).toBe(401)
  // Removing an address from AUTH_ALLOWED_EMAILS revokes an existing session.
  await owner`UPDATE auth_user SET email_verified = true, email = 'removed@example.com' WHERE id = ${user.id}`
  expect((await list(cookie)).status).toBe(401)
  expect(
    (
      await fixture.request(
        '/passkey/generate-register-options',
        undefined,
        cookie
      )
    ).status
  ).toBe(401)
  await owner`UPDATE auth_user SET email = 'cook@example.com' WHERE id = ${user.id}`
  expect(
    (
      await fixture.request(
        '/passkey/generate-register-options',
        undefined,
        cookie
      )
    ).status
  ).toBe(200)
})

test('profile updates accept names only, from this site', async () => {
  const fixture = await authFixture()
  const { cookie, user } = await signIn(fixture)
  const update = (body: unknown, headers: Record<string, string> = {}) =>
    fixture.request('/update-user', body, cookie, headers)
  expect(
    (await update({ name: 'Cook' }, { Origin: 'https://evil.example' })).status
  ).toBe(403)
  expect((await update({ image: 'https://evil.example/x.png' })).status).toBe(
    400
  )
  expect((await update({ email: 'second@example.com' })).status).toBe(400)
  expect((await update({ givenName: 'x'.repeat(101) })).status).toBe(400)
  const saved = await update({
    name: ' Head cook ',
    givenName: 'Sam',
    familyName: null
  })
  expect(saved.status).toBe(200)
  const [row] =
    await owner`SELECT name, given_name, family_name, email, image FROM auth_user WHERE id = ${user.id}`
  expect(row).toEqual({
    name: 'Head cook',
    given_name: 'Sam',
    family_name: '',
    email: 'cook@example.com',
    image: null
  })
})

test('passwords, reset links and magic links are invite-only, same-site and single-use', async () => {
  const fixture = await authFixture()
  const password = 'correct horse battery staple'
  // No public sign-up, even for an invited address.
  const signUp = await fixture.request('/sign-up/email', {
    email: 'cook@example.com',
    password,
    name: 'Cook'
  })
  expect(signUp.status).toBe(400)
  expect((await owner`SELECT id FROM auth_user`).length).toBe(0)
  const { user } = await signIn(fixture)
  // An account created by email code has no password until a reset link sets one.
  expect(
    (
      await fixture.request('/sign-in/email', {
        email: 'cook@example.com',
        password
      })
    ).status
  ).toBe(401)
  await owner`DELETE FROM auth_email_limit`

  for (const email of ['stranger@example.com', 'COOK@example.com '])
    expect(
      (
        await fixture.request('/request-password-reset', {
          email,
          redirectTo: '/auth/reset-password'
        })
      ).status
    ).toBe(200)
  expect(fixture.links.map(({ email, kind }) => [email, kind])).toEqual([
    ['cook@example.com', 'reset-password']
  ])
  const resetUrl = new URL(fixture.links[0]!.url)
  expect(resetUrl.origin).toBe(origin)
  const token = resetUrl.pathname.split('/').at(-1)!
  const [resetRow] =
    await owner`SELECT identifier FROM auth_verification WHERE identifier = ${'reset-password:' + token}`
  expect(resetRow).toBeDefined()
  expect(
    (
      await fixture.request('/reset-password', {
        newPassword: 'short',
        token
      })
    ).status
  ).toBe(400)
  const reset = await fixture.request('/reset-password', {
    newPassword: password,
    token
  })
  expect(reset.status).toBe(200)
  expect(
    (
      await fixture.request('/reset-password', {
        newPassword: password + '!',
        token
      })
    ).status
  ).toBe(400)
  const [credential] = await owner`SELECT password FROM auth_account
    WHERE user_id = ${user.id} AND provider_id = 'credential'`
  expect(credential.password).toBeTruthy()
  expect(credential.password).not.toContain(password)
  expect(
    (
      await fixture.request('/sign-in/email', {
        email: 'cook@example.com',
        password: 'wrong password entirely'
      })
    ).status
  ).toBe(401)
  const signedIn = await fixture.request('/sign-in/email', {
    email: 'cook@example.com',
    password
  })
  expect(signedIn.status).toBe(200)
  const session = await fixture.request(
    '/get-session',
    undefined,
    mergeCookies(signedIn)
  )
  expect((await session.json()).user.id).toBe(user.id)

  fixture.links.length = 0
  expect(
    (
      await fixture.request('/sign-in/magic-link', {
        email: 'stranger@example.com',
        callbackURL: '/'
      })
    ).status
  ).toBe(200)
  expect(fixture.links.length).toBe(0)
  for (const callbackURL of [
    'https://attacker.example/',
    '//attacker.example/',
    '/.//attacker.example/',
    '/\t/attacker.example/',
    '/\\attacker.example/'
  ]) {
    await owner`DELETE FROM auth_rate_limit`
    expect(
      (
        await fixture.request('/sign-in/magic-link', {
          email: 'second@example.com',
          callbackURL
        })
      ).status
    ).toBe(403)
  }
  await owner`DELETE FROM auth_rate_limit`
  expect(
    (
      await fixture.request('/request-password-reset', {
        email: 'cook@example.com',
        redirectTo: 'https://attacker.example/reset'
      })
    ).status
  ).toBe(403)
  expect(fixture.links.length).toBe(0)
  const requested = await fixture.request('/sign-in/magic-link', {
    email: 'second@example.com',
    callbackURL: origin + '/'
  })
  expect(requested.status).toBe(200)
  expect(fixture.links.map(({ email, kind }) => [email, kind])).toEqual([
    ['second@example.com', 'magic-link']
  ])
  const magic = new URL(fixture.links[0]!.url)
  expect(magic.origin).toBe(origin)
  // Tokens are stored hashed, never as sent.
  const magicToken = magic.searchParams.get('token')!
  expect(
    (await owner`SELECT identifier FROM auth_verification`).some(
      (row) => row.identifier === magicToken
    )
  ).toBe(false)
  const verify = () =>
    fixture.auth.handler(
      new Request(magic, {
        headers: { 'CF-Connecting-IP': '203.0.113.250' },
        redirect: 'manual'
      })
    )
  const verified = await verify()
  expect(verified.status).toBe(302)
  expect(verified.headers.get('location')).toBe(origin + '/')
  const magicSession = await fixture.request(
    '/get-session',
    undefined,
    mergeCookies(verified)
  )
  const magicUser = (await magicSession.json()).user
  expect(magicUser.email).toBe('second@example.com')
  expect(magicUser.emailVerified).toBe(true)
  const replay = await verify()
  expect(mergeCookies(replay).includes('session_token')).toBe(false)
  expect(
    (await owner`SELECT id FROM auth_user WHERE email = 'stranger@example.com'`)
      .length
  ).toBe(0)
})

test('the app forwards only the auth endpoints it uses, and none under Clerk', async () => {
  if (!existsSync('dist/server/server.js'))
    throw new Error('Run bun run build before this test')
  Object.assign(process.env, {
    APP_ORIGIN: origin,
    DATABASE_URL: databaseUrl(runtimeName),
    CLERK_PUBLISHABLE_KEY: 'pk_live_Y2xlcmsuZXhhbXBsZS5jb20k',
    CLERK_SECRET_KEY: 'sk_live_test',
    AUTH_PROVIDER: 'better-auth',
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: secret,
    BREVO_API_KEY: 'fixture-never-used-to-send',
    AUTH_EMAIL_FROM: 'recipes@example.com',
    AUTH_ALLOWED_EMAILS: allowed.join(',')
  })
  await authFixture()
  const { default: start } = (await import(
    '../dist/server/server.js' as string
  )) as { default: { fetch: (request: Request) => Promise<Response> } }
  const app = createApp({
    app: (request) => start.fetch(request),
    checkHealth: async () => {},
    origin,
    revision: 'auth-test'
  })
  const call = (path: string, method = 'POST', headers = {}) =>
    app(
      new Request(origin + '/api/auth' + path, {
        method,
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '198.51.100.' + ++fixtureNumber,
          ...headers
        },
        body: method === 'GET' ? undefined : '{}'
      })
    )
  for (const path of [
    '/sign-up/email',
    '/email-otp/get-verification-otp',
    '/email-otp/verify-email',
    '/forget-password/email-otp',
    '/delete-user',
    '/list-sessions',
    '/change-email',
    '/ok'
  ])
    expect((await call(path)).status).toBe(404)
  for (const [path, method] of [
    ['/get-session', 'GET'],
    ['/list-accounts', 'GET'],
    ['/email-otp/send-verification-otp', 'POST'],
    ['/sign-in/email-otp', 'POST'],
    ['/sign-in/email', 'POST'],
    ['/sign-in/magic-link', 'POST'],
    ['/request-password-reset', 'POST'],
    ['/reset-password', 'POST'],
    ['/change-password', 'POST'],
    ['/passkey/generate-authenticate-options', 'GET']
  ] as const)
    expect((await call(path, method)).status).not.toBe(404)
  const session = await call('/get-session', 'GET')
  expect(session.status).toBe(200)
  expect(session.headers.get('cache-control')).toBe('no-store')
  expect(
    (await call('/get-session', 'GET', { Origin: 'https://evil.example' }))
      .status
  ).toBe(403)
  // The sign-in pages render; Clerk's pages hand over to them.
  for (const path of ['/auth/sign-in', '/auth/email-otp', '/auth/magic-link'])
    expect((await app(new Request(origin + path))).status).toBe(200)
  const page = await (await app(new Request(origin + '/auth/sign-in'))).text()
  expect(page).not.toContain('clerk.')

  // With the default provider, none of Better Auth is reachable.
  process.env.AUTH_PROVIDER = 'clerk'
  for (const path of [
    '/get-session',
    '/sign-in/email-otp',
    '/email-otp/send-verification-otp'
  ])
    expect((await call(path)).status).toBe(404)
  expect((await app(new Request(origin + '/sign-in'))).status).toBe(200)
})
