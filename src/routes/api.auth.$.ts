import { createFileRoute } from '@tanstack/react-router'
import { readEnv } from '@/server/env'
import { getBetterAuth } from '@/server/auth'

// Only the endpoints the app uses. Sign-up is closed: Recipe Saver is
// invite-only, so `/sign-up/email` is not forwarded.
const paths = new Set([
  '/get-session',
  '/sign-out',
  '/update-user',
  '/email-otp/send-verification-otp',
  '/sign-in/email-otp',
  '/sign-in/email',
  '/sign-in/magic-link',
  '/magic-link/verify',
  '/request-password-reset',
  '/reset-password',
  '/change-password',
  '/list-accounts',
  '/passkey/generate-register-options',
  '/passkey/verify-registration',
  '/passkey/generate-authenticate-options',
  '/passkey/verify-authentication',
  '/passkey/list-user-passkeys',
  '/passkey/update-passkey',
  '/passkey/delete-passkey'
])

function isForwardedAuthPath(path: string) {
  // The emailed reset link lands on /reset-password/<token> before redirecting.
  return paths.has(path) || /^\/reset-password\/[\w-]+$/.test(path)
}

async function handler(request: Request) {
  const path = new URL(request.url).pathname.slice('/api/auth'.length)
  if (readEnv().AUTH_PROVIDER !== 'better-auth' || !isForwardedAuthPath(path))
    return new Response('Not found', { status: 404 })
  return getBetterAuth().handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request)
    }
  }
})
