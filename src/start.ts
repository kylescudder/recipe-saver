import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  requestMiddleware: [
    clerkMiddleware(() => ({
      // Sessions are only accepted for the app's own origin.
      authorizedParties: [new URL(process.env.APP_ORIGIN!).origin]
    }))
  ]
}))
