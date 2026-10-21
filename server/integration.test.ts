import { beforeAll, afterAll, test, expect } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { database, migrate } from './db'
import { appRouter } from './router'
import { createApp } from './app'
import { importSnapshot } from '../deploy/import-mongo'

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
const profile = { name: 'Test Cook', username: 'test-cook', bio: '', image: '' }
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
test('all profile and recipe procedures reject unauthenticated access', async () => {
  const anonymous = caller(null)
  for (const operation of [
    () => anonymous.profile.me(),
    () => anonymous.profile.save(profile),
    () => anonymous.recipes.list(),
    () => anonymous.recipes.save(recipe),
    () => anonymous.recipes.archive('missing')
  ]) {
    await expect(operation()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  }
})
test('new users can onboard; identity cannot be supplied by the client', async () => {
  const cook = caller('clerk-cook')
  expect(await cook.profile.me()).toBeNull()
  await expect(cook.recipes.list()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  await cook.profile.save({
    ...profile,
    clerkId: 'other-user'
  } as typeof profile)
  expect((await cook.profile.me())?.clerkId).toBe('clerk-cook')
  expect(await caller('other-user').profile.me()).toBeNull()
})
test('shared household create/update/list/archive, stable IDs and source validation', async () => {
  const cook = caller('clerk-cook')
  const saved = await cook.recipes.save(recipe)
  expect(saved._id).toBeTruthy()
  await caller('clerk-second').profile.save({
    ...profile,
    username: 'second-cook'
  })
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
  expect((await caller('clerk-cook').profile.me())?.onboarded).toBe(true)
  await denied(runtime.unsafe('CREATE TABLE forbidden(id int)'))
  await denied(runtime.unsafe('CREATE SCHEMA forbidden'))
  await denied(runtime.unsafe('CREATE ROLE forbidden'))
  await denied(client(runtimeName, otherName)`SELECT 1`)
})
test('Mongo export import preserves IDs, archived rows and profiles; repeat and conflict are safe', async () => {
  const recipes = [
    { ...recipe, _id: { $oid: '0123456789abcdef01234567' }, archive: true }
  ]
  const users = [
    {
      _id: { $oid: '1123456789abcdef01234567' },
      clerkId: 'legacy-clerk',
      username: 'legacy-user',
      name: 'Legacy User',
      bio: '🍲',
      image: '',
      onboarded: true
    }
  ]
  expect(await importSnapshot(owner, recipes, users)).toEqual({
    recipes: 1,
    users: 1
  })
  expect(await importSnapshot(owner, recipes, users)).toEqual({
    recipes: 1,
    users: 1
  })
  expect((await caller('legacy-clerk').profile.me())?.bio).toBe('🍲')
  expect(
    (
      await runtime`SELECT archive FROM recipes WHERE id = '0123456789abcdef01234567'`
    )[0].archive
  ).toBe(true)
  const newRow = { ...recipe, _id: 'new-rollback-row' }
  await expect(
    importSnapshot(
      owner,
      [newRow, { ...recipes[0], recipeName: 'Conflicting edit' }],
      users
    )
  ).rejects.toThrow('import rolled back')
  expect(
    (await runtime`SELECT id FROM recipes WHERE id = 'new-rollback-row'`).length
  ).toBe(0)
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
  const conflict = await app(
    new Request(origin + '/api/trpc/profile.save', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-session',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ ...profile, username: 'second-cook' })
    })
  )
  // Database constraint details must never leak into the RPC response.
  expect(conflict.status).toBe(500)
  expect(await conflict.text()).not.toContain('users_username_key')
  expect((await app(new Request(origin + '/api/health'))).status).toBe(200)
  for (const path of ['/', '/recipes', '/onboarding', '/sign-in', '/sign-up'])
    expect((await app(new Request(origin + path))).status).toBe(200)
  for (const path of ['/api/missing', '/assets/missing.js', '/missing'])
    expect((await app(new Request(origin + path))).status).toBe(404)
})
