import { SignIn } from '@clerk/tanstack-react-start'
import {
  createFileRoute,
  Navigate,
  useLoaderData
} from '@tanstack/react-router'
import { authAppearance } from '@/components/auth'

export const Route = createFileRoute('/sign-in/$')({ component: SignInPage })

function SignInPage() {
  const { provider } = useLoaderData({ from: '__root__' })
  if (provider === 'better-auth')
    return <Navigate to='/auth/$path' params={{ path: 'sign-in' }} replace />
  return (
    <div className='auth-page'>
      <div className='page-heading'>
        <p className='page-context'>Welcome to your kitchen</p>
        <h1>Open your recipe book.</h1>
        <p>Sign in to find something good to cook.</p>
      </div>
      <SignIn
        routing='hash'
        signUpUrl='/sign-up'
        forceRedirectUrl='/'
        appearance={authAppearance}
      />
    </div>
  )
}
