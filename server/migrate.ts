import { database, migrate } from '../src/server/db'
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const sql = database(process.env.DATABASE_URL)
try {
  await migrate(sql)
  console.log('Recipe Saver schema is ready')
} finally {
  await sql.end()
}
