import '@tanstack/react-start/server-only'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

type RuntimeEnv = Record<string, string | undefined>

const databaseSchema = {
  DATABASE_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false
    const url = new URL(value)
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      !!url.hostname &&
      !!url.pathname.replace(/\//g, '')
    )
  })
}

const origin = z
  .url()
  .refine((value) => {
    if (!URL.canParse(value)) return false
    const url = new URL(value)
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    )
  })
  .transform((value) => new URL(value).origin)

const validation = {
  emptyStringAsUndefined: true,
  onValidationError(issues: readonly { path?: readonly unknown[] }[]): never {
    // Report setting names only; credentials must never appear in startup logs.
    throw new Error(
      'Invalid environment variables: ' +
        issues.map((issue) => issue.path?.join('.')).join(', ')
    )
  }
}

// Read at runtime, rather than during Vite's secret-free production build.
export function readDatabaseEnv(runtimeEnv: RuntimeEnv = process.env) {
  return createEnv({ server: databaseSchema, runtimeEnv, ...validation })
}

export function readEnv(runtimeEnv: RuntimeEnv = process.env) {
  const env = createEnv({
    server: {
      ...databaseSchema,
      APP_ORIGIN: origin,
      // Clerk stays the default and the rollback; Better Auth is opt-in.
      AUTH_PROVIDER: z.enum(['clerk', 'better-auth']).default('clerk'),
      CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
      CLERK_SECRET_KEY: z.string().min(1).optional(),
      BETTER_AUTH_URL: origin.optional(),
      BETTER_AUTH_SECRET: z.string().min(32).optional(),
      BREVO_API_KEY: z.string().min(1).optional(),
      AUTH_EMAIL_FROM: z.email().optional(),
      AUTH_EMAIL_DAILY_LIMIT: z.coerce
        .number()
        .int()
        .min(1)
        .max(300)
        .default(40),
      // Invite-only household: comma-separated emails that may sign in.
      AUTH_ALLOWED_EMAILS: z
        .string()
        .default('')
        .transform((value) =>
          value
            .split(',')
            .map((entry) => entry.trim().toLowerCase())
            .filter(Boolean)
        )
        .pipe(z.array(z.email())),
      PORT: z.coerce.number().int().min(1).max(65535).default(3000),
      NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
      RECIPE_SAVER_REVISION: z.string().default('unknown')
    },
    runtimeEnv,
    ...validation
  })
  const required =
    env.AUTH_PROVIDER === 'clerk'
      ? (['CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'] as const)
      : ([
          'BETTER_AUTH_URL',
          'BETTER_AUTH_SECRET',
          'BREVO_API_KEY',
          'AUTH_EMAIL_FROM'
        ] as const)
  const missing: string[] = required.filter((key) => !env[key])
  if (env.AUTH_PROVIDER === 'better-auth' && !env.AUTH_ALLOWED_EMAILS.length)
    missing.push('AUTH_ALLOWED_EMAILS')
  if (missing.length)
    throw new Error('Invalid environment variables: ' + missing.join(', '))
  if (
    env.AUTH_PROVIDER === 'better-auth' &&
    // Cookies, passkeys and emailed links are bound to the public origin.
    (env.BETTER_AUTH_URL !== env.APP_ORIGIN ||
      (env.NODE_ENV === 'production' &&
        !env.BETTER_AUTH_URL?.startsWith('https://')))
  )
    throw new Error('Invalid environment variables: BETTER_AUTH_URL')
  return env
}
