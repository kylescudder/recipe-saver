import { createFileRoute, Navigate } from '@tanstack/react-router'
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
  const { path } = Route.useParams()
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
