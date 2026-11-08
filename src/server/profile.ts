import '@tanstack/react-start/server-only'
import { getBetterAuth } from './auth'
import { readEnv } from './env'
import { createProfileHandler } from './profile-handler'
import { runtimeOrm } from './runtime-db'

let handler: ReturnType<typeof createProfileHandler> | undefined

// Better Auth only; under Clerk the photo endpoint does not exist.
export function handleProfileRequest(request: Request) {
  const env = readEnv()
  if (env.AUTH_PROVIDER !== 'better-auth')
    return new Response('Not found', { status: 404 })
  handler ??= createProfileHandler(runtimeOrm(), {
    origin: new URL(env.BETTER_AUTH_URL!).origin,
    allowedEmails: env.AUTH_ALLOWED_EMAILS,
    getSession: (headers) => getBetterAuth().api.getSession({ headers })
  })
  return handler(request)
}
