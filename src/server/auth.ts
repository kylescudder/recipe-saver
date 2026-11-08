import '@tanstack/react-start/server-only'
import { readEnv } from './env'
import { createRecipeSaverAuth } from './auth-factory'
import { sendLinkEmail, sendLoginEmail } from './auth-email'
import { runtimeOrm } from './runtime-db'

let instance: ReturnType<typeof createRecipeSaverAuth> | undefined

export function getBetterAuth() {
  if (instance) return instance
  const env = readEnv()
  if (env.AUTH_PROVIDER !== 'better-auth')
    throw new Error('Better Auth is not enabled')
  const origin = new URL(env.BETTER_AUTH_URL!).origin
  const mail = { apiKey: env.BREVO_API_KEY!, from: env.AUTH_EMAIL_FROM! }
  instance = createRecipeSaverAuth(
    runtimeOrm(),
    {
      baseURL: origin,
      secret: env.BETTER_AUTH_SECRET!,
      allowedEmails: env.AUTH_ALLOWED_EMAILS,
      dailyEmailLimit: env.AUTH_EMAIL_DAILY_LIMIT
    },
    (email, otp) => sendLoginEmail(mail, origin, email, otp),
    (email, kind, url) => sendLinkEmail(mail, origin, email, kind, url)
  )
  return instance
}
