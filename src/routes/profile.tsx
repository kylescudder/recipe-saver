import {
  createFileRoute,
  Link,
  Navigate,
  useLoaderData,
  useNavigate
} from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@better-auth-ui/react'
import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { ChangePassword } from '@/components/auth/settings/security/change-password'
import { UserProfile } from '@/components/auth/settings/account/user-profile'
import { Passkeys } from '@/components/auth/passkey/passkeys'
import { Button } from '@/components/auth/ui/button'
import { OpeningBook } from '@/components/auth'
import { clearPendingSignIn } from '@/lib/pending-sign-in'
import { BetterAuthUIProvider } from '@/components/BetterAuthUIProvider'

export const Route = createFileRoute('/profile')({ component: ProfilePage })

function ProfilePage() {
  const { provider } = useLoaderData({ from: '__root__' })
  // Clerk mode has no profile page; its account is managed by Clerk.
  if (provider !== 'better-auth') return <Navigate to='/' replace />
  return (
    <div className='profile-page'>
      <div className='page-heading'>
        <p className='page-context'>
          <Link to='/'>Back to your recipes</Link>
        </p>
        <h1>Your profile.</h1>
        <p>Your name, photo, password and passkeys for Recipe Saver.</p>
      </div>
      <BetterAuthUIProvider redirectTo='/profile'>
        <BetterAuthProfile />
      </BetterAuthUIProvider>
    </div>
  )
}

function BetterAuthProfile() {
  // Better Auth UI's session query, not the client's nanostore: sign-in awaits
  // this query before navigating here, while the nanostore can still hold the
  // signed-out value after a "Sign in again" round trip and bounce to sign-in.
  const { data: session, isPending } = useSession(authClient)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  useEffect(() => {
    if (session) clearPendingSignIn()
    else if (!isPending)
      void navigate({
        href: '/auth/sign-in?redirectTo=%2Fprofile',
        replace: true
      })
  }, [isPending, navigate, session])
  if (!session) return <OpeningBook />
  async function signOut() {
    setSigningOut(true)
    setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError('Unable to sign out. Please try again.')
        return
      }
      queryClient.clear()
      await navigate({ to: '/' })
    } catch {
      setError('Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }
  return (
    <div className='recipe-auth-settings flex flex-col gap-8'>
      <UserProfile key={session.user.id} />
      <ChangePassword />
      <Passkeys />
      <p className='text-muted-foreground -mt-4 text-sm'>
        Email codes remain available for recovery.
      </p>
      {error && (
        <p role='alert' className='form-error'>
          {error}
        </p>
      )}
      <Button
        type='button'
        variant='outline'
        className='self-start'
        disabled={signingOut}
        onClick={() => void signOut()}
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  )
}
