import '@tanstack/react-start/server-only'
import { database, orm, type Orm } from './db'
import { readDatabaseEnv } from './env'

let shared: Orm | undefined

// One four-connection pool per process, shared by tRPC and Better Auth.
export function runtimeOrm() {
  shared ??= orm(database(readDatabaseEnv().DATABASE_URL))
  return shared
}
