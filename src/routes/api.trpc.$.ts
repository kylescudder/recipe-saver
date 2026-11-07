import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute } from '@tanstack/react-router'
import { readEnv } from '@/server/env'
import { getBetterAuth } from '@/server/auth'
import { betterAuthIdentity } from '@/server/auth-factory'
import { runtimeOrm } from '@/server/runtime-db'
import { createTrpcHandler } from '@/server/trpc-handler'

let trpc: ReturnType<typeof createTrpcHandler> | undefined

// Created on first use so the shared pool reads the runtime configuration.
function handler(request: Request) {
  trpc ??= createTrpcHandler(runtimeOrm(), async (request) => {
    const env = readEnv()
    if (env.AUTH_PROVIDER === 'clerk')
      return (await auth({ acceptsToken: 'session_token' })).userId
    return betterAuthIdentity(getBetterAuth(), env.AUTH_ALLOWED_EMAILS)(request)
  })
  return trpc(request)
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request)
    }
  }
})
