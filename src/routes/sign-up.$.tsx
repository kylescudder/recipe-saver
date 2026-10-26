import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { authAppearance } from '@/components/auth'

export const Route = createFileRoute('/sign-up/$')({
  component: () => (
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
})
