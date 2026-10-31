import { database, migrate } from '../src/server/db'
import { readDatabaseEnv } from '../src/server/env'

const sql = database(readDatabaseEnv().DATABASE_URL, 1)
try {
  await migrate(sql)
  console.log('Recipe Saver schema is ready')
} finally {
  await sql.end()
}
