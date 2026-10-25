import { beforeAll, afterAll, test, expect } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { database, migrate, type Database } from './db'
import { appRouter } from './router'
import { createApp } from './app'
import { stallHealthQueries } from '../tests/postgres-proxy'

if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    'TEST_DATABASE_URL must identify a disposable test PostgreSQL service'
  )
const admin = postgres(process.env.TEST_DATABASE_URL, {
  max: 1,
  onnotice: () => {}
})
const name = 'recipe_ci_' + randomUUID().replaceAll('-', '').slice(0, 10)
const ownerName = name + '_owner'
const runtimeName = name + '_runtime'
const otherName = name + '_other'
const clients: ReturnType<typeof postgres>[] = []
let owner: ReturnType<typeof postgres>
let runtime: ReturnType<typeof postgres>
const created: string[] = []
function client(user: string, db = name) {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  url.username = user
  url.password = ''
  url.pathname = '/' + db
  const sql = database(url.toString())
  clients.push(sql)
  return sql
}
const caller = (userId: string | null) =>
  appRouter.createCaller({ sql: runtime, userId })
const recipe = {
  _id: '',
  recipeName: 'Test pasta',
  recipeLink: 'https://example.com/pasta',
  recipeBook: '',
  recipePageNo: '',
  archive: false
}
async function denied(operation: PromiseLike<unknown>) {
  await expect(Promise.resolve(operation)).rejects.toMatchObject({
    code: '42501'
  })
}
beforeAll(async () => {
  for (const role of [ownerName, runtimeName]) {
    await admin.unsafe(
      `CREATE ROLE "${role}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`
    )
    created.push(role)
  }
  for (const db of [name, otherName]) {
    await admin.unsafe(`CREATE DATABASE "${db}" OWNER "${ownerName}"`)
    created.push(db)
    await admin.unsafe(`REVOKE ALL ON DATABASE "${db}" FROM PUBLIC`)
  }
  await admin.unsafe(`GRANT CONNECT ON DATABASE "${name}" TO "${runtimeName}"`)
  owner = client(ownerName)
  await owner.unsafe(`REVOKE ALL ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO "${runtimeName}";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${runtimeName}";`)
  await migrate(owner)
  await migrate(owner)
  runtime = client(runtimeName)
})
afterAll(async () => {
  await Promise.all(clients.map((sql) => sql.end({ timeout: 1 })))
  for (const db of [otherName, name])
    if (created.includes(db))
      await admin.unsafe(`DROP DATABASE "${db}" WITH (FORCE)`)
  for (const role of [runtimeName, ownerName])
    if (created.includes(role)) await admin.unsafe(`DROP ROLE "${role}"`)
  await admin.end({ timeout: 1 })
})
test('all recipe procedures reject unauthenticated access', async () => {
  const anonymous = caller(null)
  for (const operation of [
    () => anonymous.recipes.list(),
    () => anonymous.recipes.save(recipe),
    () => anonymous.recipes.archive('missing')
  ]) {
    await expect(operation()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  }
})
test('any signed-in user reaches the shared collection immediately', async () => {
  expect(await caller('clerk-new').recipes.list()).toHaveLength(0)
})
test('shared household create/update/list/archive, stable IDs and source validation', async () => {
  const cook = caller('clerk-cook')
  const saved = await cook.recipes.save(recipe)
  expect(saved._id).toBeTruthy()
  expect(
    (await caller('clerk-second').recipes.list()).some(
      (row) => row._id === saved._id
    )
  ).toBe(true)
  const updated = await cook.recipes.save({
    ...saved,
    recipeName: 'Updated pasta'
  })
  expect(updated._id).toBe(saved._id)
  expect(updated.recipeName).toBe('Updated pasta')
  for (const invalid of [
    { ...recipe, recipeName: ' ' },
    { ...recipe, recipeLink: 'javascript:alert(1)' },
    { ...recipe, recipeLink: '' },
    { ...recipe, recipeBook: 'Both sources' }
  ]) {
    await expect(cook.recipes.save(invalid)).rejects.toMatchObject({
      code: 'BAD_REQUEST'
    })
  }
  await cook.recipes.archive(saved._id)
  expect((await cook.recipes.list()).some((row) => row._id === saved._id)).toBe(
    false
  )
  expect(
    (await runtime`SELECT archive FROM recipes WHERE id = ${saved._id}`)[0]
      .archive
  ).toBe(true)
  await expect(
    cook.recipes.save({ ...recipe, _id: 'missing' })
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})
test('owner migrations are repeatable; runtime cannot perform DDL or enter another database', async () => {
  await migrate(owner)
  expect(
    (await runtime`SELECT count(*)::int AS rows FROM recipes`)[0].rows
  ).toBeGreaterThan(0)
  expect(
    (await runtime`SELECT to_regclass('users') AS name`)[0].name
  ).toBeNull()
  await denied(runtime.unsafe('CREATE TABLE forbidden(id int)'))
  await denied(runtime.unsafe('CREATE SCHEMA forbidden'))
  await denied(runtime.unsafe('CREATE ROLE forbidden'))
  await denied(client(runtimeName, otherName)`SELECT 1`)
})
test('HTTP routing, error redaction, bearer auth boundary, cache headers, assets and health', async () => {
  const origin = 'https://recipes.example'
  const app = createApp({
    sql: runtime,
    origin,
    revision: 'a'.repeat(40),
    authenticate: async (req) =>
      req.headers.get('authorization') === 'Bearer test-session'
        ? 'clerk-cook'
        : null
  })
  for (const authorization of [undefined, 'Bearer forged']) {
    const response = await app(
      new Request(origin + '/api/trpc/recipes.list', {
        headers: authorization ? { authorization } : {}
      })
    )
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  }
  const response = await app(
    new Request(origin + '/api/trpc/recipes.list', {
      headers: { authorization: 'Bearer test-session' }
    })
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('x-recipe-saver-revision')).toBe('a'.repeat(40))
  expect(
    (
      await app(
        new Request(origin + '/api/trpc/recipes.list', {
          headers: { origin: 'https://evil.example' }
        })
      )
    ).status
  ).toBe(403)
  const failing = createApp({
    sql: (() =>
      Promise.reject(
        new Error('relation "recipes_secret_detail" does not exist')
      )) as unknown as Database,
    origin,
    revision: 'a'.repeat(40),
    authenticate: async () => 'clerk-cook'
  })
  const failed = await failing(new Request(origin + '/api/trpc/recipes.list'))
  // Database error details must never leak into the RPC response.
  expect(failed.status).toBe(500)
  expect(await failed.text()).not.toContain('recipes_secret_detail')
  for (const path of ['/healthz', '/api/health'])
    expect((await app(new Request(origin + path))).status).toBe(200)
  for (const path of ['/', '/recipes', '/sign-in', '/sign-up'])
    expect((await app(new Request(origin + path))).status).toBe(200)
  for (const path of [
    '/api/missing',
    '/assets/missing.js',
    '/missing',
    '/onboarding'
  ])
    expect((await app(new Request(origin + path))).status).toBe(404)
})

test('stalled health probes do not exhaust the shared pool and recover', async () => {
  const url = new URL(process.env.TEST_DATABASE_URL!)
  url.username = runtimeName
  url.password = ''
  url.pathname = '/' + name
  const proxy = await stallHealthQueries(url.toString())
  const sql = database(proxy.url)
  const app = createApp({
    sql,
    authenticate: async () => null,
    origin: 'http://localhost',
    revision: 'probe-test'
  })
  try {
    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        app(
          new Request('http://localhost' + (i % 2 ? '/api/health' : '/healthz'))
        )
      )
    )
    for (const response of responses) {
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ ok: false })
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(response.headers.get('X-Recipe-Saver-Revision')).toBe('probe-test')
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const rows = await Promise.race([
        sql`SELECT 42 AS answer`,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Health probes exhausted the shared pool')),
            1500
          )
        })
      ])
      expect(rows[0].answer).toBe(42)
    } finally {
      clearTimeout(timer)
    }
    proxy.release()
    expect((await app(new Request('http://localhost/healthz'))).status).toBe(
      200
    )
  } finally {
    proxy.release()
    await sql.end({ timeout: 1 })
    await proxy.close()
  }
}, 10000)
