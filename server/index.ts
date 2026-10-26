import { createApp } from './app'
import { createHealthCheck } from '../src/server/health'
for (const name of [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'APP_ORIGIN'
])
  if (!process.env[name]) throw new Error(`${name} is required`)
const origin = new URL(process.env.APP_ORIGIN!).origin
const serverEntry = '../dist/server/server.js'
const { default: start } = (await import(serverEntry)) as {
  default: { fetch: (request: Request) => Response | Promise<Response> }
}
export default {
  maxRequestBodySize: 65536,
  hostname: '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
  fetch: createApp({
    app: (request) => start.fetch(request),
    checkHealth: createHealthCheck(process.env.DATABASE_URL!),
    origin,
    revision: process.env.RECIPE_SAVER_REVISION ?? 'unknown'
  })
}
