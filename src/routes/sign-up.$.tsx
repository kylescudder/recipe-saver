import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-up/$')({ component: SignIn })

// Recipe Saver is invite-only, so there is no sign-up form.
function SignIn() {
  return <Navigate to='/auth/$path' params={{ path: 'sign-in' }} replace />
}
