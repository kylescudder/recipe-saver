import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate as migrateDrizzle } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from './schema'

export function database(url: string, max = 4) {
  return postgres(url, {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {}
  })
}
export type Database = ReturnType<typeof database>

// Drizzle queries on an existing postgres.js client and its pool.
export function orm(sql: Database) {
  return drizzle(sql, { schema })
}
export type Orm = ReturnType<typeof orm>

// Runs with the owner role only. The journal lives in its own schema, which the
// runtime role cannot read or change.
export async function migrate(sql: Database) {
  await migrateDrizzle(orm(sql), {
    migrationsFolder: new URL('../../drizzle', import.meta.url).pathname,
    migrationsSchema: 'drizzle',
    migrationsTable: '__drizzle_migrations'
  })
}
