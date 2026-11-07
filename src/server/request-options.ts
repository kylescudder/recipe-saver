import '@tanstack/react-start/server-only'
import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { readEnv } from './env'

export function requestOptions() {
  const env = readEnv()
  // Better Auth sessions are read by the API routes; Clerk is not loaded.
  if (env.AUTH_PROVIDER === 'better-auth') return {}
  return {
    requestMiddleware: [
      clerkMiddleware(() => ({
        // Sessions are only accepted for the app's own origin.
        authorizedParties: [env.APP_ORIGIN]
      }))
    ]
  }
}
