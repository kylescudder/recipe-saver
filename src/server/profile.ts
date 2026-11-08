import '@tanstack/react-start/server-only'
import { getBetterAuth } from './auth'
import { readEnv } from './env'
import { createProfileHandler } from './profile-handler'
import { runtimeOrm } from './runtime-db'

let handler: ReturnType<typeof createProfileHandler> | undefined

export function handleProfileRequest(request: Request) {
  const env = readEnv()
  handler ??= createProfileHandler(runtimeOrm(), {
    origin: new URL(env.BETTER_AUTH_URL).origin,
    allowedEmails: env.AUTH_ALLOWED_EMAILS,
    getSession: (headers) => getBetterAuth().api.getSession({ headers })
  })
  return handler(request)
}
