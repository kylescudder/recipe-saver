import { useEffect, type ReactNode } from 'react'
import { RedirectToSignIn, useAuth } from '@clerk/tanstack-react-start'
import { useLoaderData, useLocation, useNavigate } from '@tanstack/react-router'
import { Book } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function OpeningBook() {
  return (
    <div className='opening-book' role='status'>
      <Book size={30} strokeWidth={1.3} />
      <p>Opening your recipe book…</p>
    </div>
  )
}

export const authAppearance = {
  variables: {
    colorPrimary: 'hsl(var(--primary))',
    colorBackground: 'hsl(var(--card))',
    colorForeground: 'hsl(var(--foreground))',
    colorMutedForeground: 'hsl(var(--muted-foreground))',
    colorInput: 'hsl(var(--background))',
    colorInputForeground: 'hsl(var(--foreground))',
    fontFamily: 'DM Sans Variable, sans-serif',
    borderRadius: '0.4rem'
  },
  elements: {
    rootBox: 'auth-widget',
    cardBox: 'auth-card-box',
    card: 'auth-card',
    header: 'auth-widget-header',
    footer: 'auth-widget-footer',
    formFieldInput: 'auth-input',
    formButtonPrimary: 'auth-submit'
  }
}

export function Authenticated({ children }: { children: ReactNode }) {
  const { provider } = useLoaderData({ from: '__root__' })
  return provider === 'better-auth' ? (
    <BetterAuthAuthenticated>{children}</BetterAuthAuthenticated>
  ) : (
    <ClerkAuthenticated>{children}</ClerkAuthenticated>
  )
}

function ClerkAuthenticated({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <OpeningBook />
  return isSignedIn ? children : <RedirectToSignIn />
}

function BetterAuthAuthenticated({ children }: { children: ReactNode }) {
  const {
    data: session,
    isPending,
    isRefetching,
    refetch
  } = authClient.useSession()
  const { href, pathname } = useLocation()
  const navigate = useNavigate()
  // Right after sign-in this page can open before the shared session store
  // has caught up, and during the redirect below it can still render with the
  // auth page's location. Confirm with the server before leaving.
  const signedOut =
    !isPending && !isRefetching && !session && !pathname.startsWith('/auth/')
  useEffect(() => {
    if (!signedOut) return
    let current = true
    void authClient.getSession().then(({ data }) => {
      if (!current) return
      if (data) return void refetch()
      // Return here after sign-in; the auth routes only follow same-site paths.
      const redirectTo =
        href === '/' ? '' : '?redirectTo=' + encodeURIComponent(href)
      void navigate({ href: '/auth/sign-in' + redirectTo, replace: true })
    })
    return () => {
      current = false
    }
  }, [href, navigate, refetch, signedOut])
  return session ? children : <OpeningBook />
}
