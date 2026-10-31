import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createDeploymentDatabase } from './database'
import { database } from '../src/server/db'
import { createHealthCheck } from '../src/server/health'
import { stallHealthQueries } from '../tests/postgres-proxy'
import postgres from 'postgres'
function connect(url: string, max: number) {
  return adapt(postgres(url, { max, connect_timeout: 3, onnotice: () => {} }))
}
function adapt(pool: ReturnType<typeof postgres>): Client {
  return {
    query: async (text) => pool.unsafe(text),
    reserve: async () => {
      const connection = await pool.reserve()
      return {
        query: async (text) => connection.unsafe(text),
        release: async () => {
          connection.release()
        }
      }
    },
    close: async () => {
      await pool.end({ timeout: 1 })
    }
  }
}

type Reservation = {
  query(text: string): Promise<Record<string, unknown>[]>
  release(): Promise<void>
}
type Client = {
  query(text: string): Promise<Record<string, unknown>[]>
  reserve(): Promise<Reservation>
  close(): Promise<void>
}

async function checkBudget() {
  const controlUrl = process.env.TEST_DATABASE_URL
  if (
    !controlUrl ||
    !/^\/(postgres|[a-z_]+_test)$/.test(new URL(controlUrl).pathname)
  )
    throw new Error(
      'TEST_DATABASE_URL must name postgres or a disposable database ending in _test'
    )
  const admin = connect(controlUrl, 1)
  const role = 'budget_' + randomUUID().replaceAll('-', '')
  const pools: Client[] = []
  const held: Reservation[] = []
  let healthProxy: Awaited<ReturnType<typeof stallHealthQueries>> | undefined
  let healthProbes: Promise<PromiseSettledResult<void>[]> | undefined
  let created = false
  try {
    await admin.query(
      `CREATE ROLE "${role}" LOGIN NOSUPERUSER CONNECTION LIMIT 8`
    )
    created = true
    const [currentDatabase] = await admin.query(
      'SELECT current_database() AS name'
    )
    const name = String(currentDatabase!.name).replaceAll('"', '""')
    await admin.query(`GRANT CONNECT ON DATABASE "${name}" TO "${role}"`)
    const url = new URL(controlUrl)
    url.username = role
    url.password = ''
    const appSql = database(url.toString())
    const app = adapt(appSql)
    const deployment = adapt(createDeploymentDatabase(url.toString()))
    const spare = connect(url.toString(), 2)
    const overflow = connect(url.toString(), 1)
    pools.push(app, deployment, spare, overflow)
    assert.equal(appSql.options.max, 4)
    const appRows = await Promise.all(
      Array.from({ length: 8 }, () =>
        app.query('SELECT pg_backend_pid() AS pid, pg_sleep(0.05)')
      )
    )
    assert.equal(new Set(appRows.map(([row]) => row!.pid)).size, 4)
    // Hold every application slot, rather than relying on a quiet test pool.
    for (let i = 0; i < 4; i++) {
      const connection = await app.reserve()
      held.push(connection)
      await connection.query('SELECT 1')
    }
    // Overlapping deployment queries must serialize on the actual deployment client.
    // This fails if its pool is changed back to four connections.
    const rows = await Promise.all(
      Array.from({ length: 4 }, () =>
        deployment.query('SELECT pg_backend_pid() AS pid, pg_sleep(0.05)')
      )
    )
    assert.equal(new Set(rows.map(([row]) => row!.pid)).size, 1)
    // Hold the real health query long enough to measure its separate connection.
    healthProxy = await stallHealthQueries(url.toString())
    const checkHealth = createHealthCheck(healthProxy.url)
    healthProbes = Promise.allSettled(
      Array.from({ length: 8 }, () => checkHealth())
    )
    const deadline = Date.now() + 1000
    while (!healthProxy.stalledConnections && Date.now() < deadline)
      await Bun.sleep(10)
    assert.equal(healthProxy.stalledConnections, 1)
    const [connections] = await admin.query(
      `SELECT count(*)::int AS total FROM pg_stat_activity WHERE usename = '${role}'`
    )
    assert.equal(connections!.total, 6)
    // The app, verifier and health occupy six slots, leaving two for operator work.
    for (let i = 0; i < 2; i++) {
      const connection = await spare.reserve()
      held.push(connection)
      await connection.query('SELECT 1')
    }
    let rejected = false
    try {
      await overflow.query('SELECT 1')
    } catch (error) {
      const value = error as { code?: string; errno?: string }
      rejected = value.code === '53300' || value.errno === '53300'
    }
    assert.equal(
      rejected,
      true,
      'The ninth connection must hit the real role limit'
    )
    healthProxy.release()
    for (const probe of await healthProbes)
      assert.equal(probe.status, 'fulfilled')
  } finally {
    healthProxy?.release()
    await healthProbes
    await healthProxy?.close()
    await Promise.all(held.map((connection) => connection.release()))
    await Promise.all(pools.map((pool) => pool.close()))
    if (created) {
      await admin.query(`DROP OWNED BY "${role}"`)
      await admin.query(`DROP ROLE "${role}"`)
    }
    await admin.close()
  }
}

await checkBudget()
console.log(
  'Connection budget passed: app 4 + health 1 + deployment 1, with two spare slots'
)
