import { SignUp } from '@clerk/tanstack-react-start'
import {
  createFileRoute,
  Navigate,
  useLoaderData
} from '@tanstack/react-router'
import { authAppearance } from '@/components/auth'

export const Route = createFileRoute('/sign-up/$')({ component: SignUpPage })

function SignUpPage() {
  const { provider } = useLoaderData({ from: '__root__' })
  // Better Auth is invite-only: there is no sign-up form.
  if (provider === 'better-auth')
    return <Navigate to='/auth/$path' params={{ path: 'sign-in' }} replace />
  return (
    <div className='auth-page'>
      <div className='page-heading'>
        <p className='page-context'>Pull up a chair</p>
        <h1>Start your collection.</h1>
        <p>Keep your favourite recipes close at hand.</p>
      </div>
      <SignUp
        routing='hash'
        signInUrl='/sign-in'
        forceRedirectUrl='/'
        appearance={authAppearance}
      />
    </div>
  )
}
