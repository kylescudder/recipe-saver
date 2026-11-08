import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in/$')({ component: SignIn })

// Older links and bookmarks; sign-in lives under /auth.
function SignIn() {
  return <Navigate to='/auth/$path' params={{ path: 'sign-in' }} replace />
}
