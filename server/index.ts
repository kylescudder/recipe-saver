import { createClerkClient } from '@clerk/backend'
import { database } from './db'
import { createApp } from './app'
import { createHealthCheck } from './health'
for (const name of [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'APP_ORIGIN'
])
  if (!process.env[name]) throw new Error(`${name} is required`)
const origin = new URL(process.env.APP_ORIGIN!).origin
const sql = database(process.env.DATABASE_URL!)
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
})
export default {
  maxRequestBodySize: 65536,
  hostname: '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
  fetch: createApp({
    sql,
    checkHealth: createHealthCheck(process.env.DATABASE_URL!),
    origin,
    revision: process.env.RECIPE_SAVER_REVISION ?? 'unknown',
    authenticate: async (request) => {
      const state = await clerk.authenticateRequest(request, {
        authorizedParties: [origin],
        acceptsToken: 'session_token'
      })
      return state.toAuth()?.userId ?? null
    }
  })
}
