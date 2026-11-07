import {
  createFileRoute,
  Navigate,
  useLoaderData
} from '@tanstack/react-router'
import { Auth } from '@/components/auth/auth'
import { BetterAuthUIProvider } from '@/components/BetterAuthUIProvider'

export const Route = createFileRoute('/auth/$path')({ component: AuthPage })

const headings: Record<string, { context: string; title: string }> = {
  'sign-out': { context: 'See you soon', title: 'Closing the book.' },
  'forgot-password': {
    context: 'Set a password',
    title: 'We’ll email you a link.'
  },
  'reset-password': {
    context: 'Set a password',
    title: 'Choose your password.'
  }
}

function AuthPage() {
  const { provider } = useLoaderData({ from: '__root__' })
  const { path } = Route.useParams()
  // Clerk keeps its own sign-in pages; these routes are Better Auth only.
  if (provider !== 'better-auth')
    return <Navigate to='/sign-in/$' params={{ _splat: '' }} replace />
  // Recipe Saver is invite-only, so there is no sign-up form.
  if (path === 'sign-up')
    return <Navigate to='/auth/$path' params={{ path: 'sign-in' }} replace />
  const heading = headings[path] ?? {
    context: 'Welcome to your kitchen',
    title: 'Open your recipe book.'
  }
  return (
    <div className='auth-page'>
      <div className='page-heading'>
        <p className='page-context'>{heading.context}</p>
        <h1>{heading.title}</h1>
      </div>
      <BetterAuthUIProvider>
        <Auth path={path} className='recipe-auth-card' />
      </BetterAuthUIProvider>
    </div>
  )
}
