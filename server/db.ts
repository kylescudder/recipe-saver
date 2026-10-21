import postgres from 'postgres'
export function database(url: string) {
  return postgres(url, { max: 4, onnotice: () => {} })
}
export type Database = ReturnType<typeof database>
export async function migrate(sql: Database) {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(72819304)`
    await tx.file(new URL('./schema.sql', import.meta.url).pathname)
  })
}
