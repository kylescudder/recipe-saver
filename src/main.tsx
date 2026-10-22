import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ClerkProvider,
  useAuth,
  useUser,
  SignIn,
  SignUp,
  RedirectToSignIn
} from '@clerk/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  Navigate
} from '@tanstack/react-router'
import { trpc } from './lib/trpc'
import RecipeList from './components/RecipeList'
import AccountProfile from './components/forms/AccountProfile'
import Topbar from './components/shared/Topbar'
import RecipeBook from './components/RecipeBook'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/sonner'
import './styles/globals.css'
import '@fontsource-variable/lora'
import '@fontsource-variable/dm-sans'
import { IconBook2 } from '@tabler/icons-react'

function OpeningBook() {
  return (
    <div className='opening-book' role='status'>
      <IconBook2 size={30} stroke={1.3} />
      <p>Opening your recipe book…</p>
    </div>
  )
}

const authAppearance = {
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

function Authenticated({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <OpeningBook />
  return isSignedIn ? children : <RedirectToSignIn />
}
function Recipes() {
  const profile = trpc.profile.me.useQuery()
  if (profile.isPending) return <p role='status'>Loading profile…</p>
  if (profile.isError)
    return (
      <p role='alert'>
        Could not load your profile.{' '}
        <button onClick={() => profile.refetch()}>Retry</button>
      </p>
    )
  return profile.data?.onboarded ? (
    <RecipeList />
  ) : (
    <Navigate to='/onboarding' />
  )
}
function Onboarding() {
  const { user } = useUser()
  const profile = trpc.profile.me.useQuery()
  if (profile.isPending || !user) return <p role='status'>Loading profile…</p>
  if (profile.isError)
    return (
      <p role='alert'>
        Could not load your profile.{' '}
        <button onClick={() => profile.refetch()}>Retry</button>
      </p>
    )
  if (profile.data?.onboarded) return <Navigate to='/' />
  return (
    <>
      <div className='page-heading'>
        <p className='page-context'>Before we begin</p>
        <h1>Make yourself at home.</h1>
        <p>A few details, then your household recipe book is ready.</p>
      </div>
      <AccountProfile
        user={
          profile.data ?? {
            _id: '',
            clerkId: user.id,
            username: user.primaryEmailAddress?.emailAddress ?? '',
            name: user.fullName ?? '',
            bio: '',
            image: user.imageUrl,
            onboarded: false
          }
        }
        btnTitle='Continue'
      />
    </>
  )
}
const root = createRootRoute({
  component: () => (
    <>
      <a className='skip-link' href='#main-content'>
        Skip to content
      </a>
      <Topbar />
      <main className='site-main' id='main-content'>
        <RecipeBook>
          <Outlet />
        </RecipeBook>
      </main>
      <footer className='site-footer'>
        A home for the recipes you come back to.
      </footer>
    </>
  ),
  notFoundComponent: () => (
    <div className='page-heading'>
      <h1>A missing page.</h1>
      <p>
        This page could not be found. <a href='/'>Return to your recipes</a>.
      </p>
    </div>
  )
})
const index = createRoute({
  getParentRoute: () => root,
  path: '/',
  component: () => (
    <Authenticated>
      <Recipes />
    </Authenticated>
  )
})
const recipes = createRoute({
  getParentRoute: () => root,
  path: '/recipes',
  component: () => (
    <Authenticated>
      <Recipes />
    </Authenticated>
  )
})
const onboarding = createRoute({
  getParentRoute: () => root,
  path: '/onboarding',
  component: () => (
    <Authenticated>
      <Onboarding />
    </Authenticated>
  )
})
const signIn = createRoute({
  getParentRoute: () => root,
  path: '/sign-in/$',
  component: () => (
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
})
const signUp = createRoute({
  getParentRoute: () => root,
  path: '/sign-up/$',
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
const router = createRouter({
  routeTree: root.addChildren([index, recipes, onboarding, signIn, signUp])
})
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  const { isLoaded, userId } = useAuth()
  if (!isLoaded) return <OpeningBook />
  // A fresh provider per identity isolates cached household/profile data without
  // cancelling the new identity's active queries during its first render.
  return <SessionApp key={userId ?? 'signed-out'} />
}
function SessionApp() {
  const { getToken } = useAuth()
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } })
  )
  const [client] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers: async () => {
            const token = await getToken()
            return token ? { Authorization: `Bearer ${token}` } : {}
          }
        })
      ]
    })
  )
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
createRoot(document.getElementById('root')!).render(
  key ? (
    <ClerkProvider
      publishableKey={key}
      signInUrl='/sign-in'
      signUpUrl='/sign-up'
      afterSignOutUrl='/sign-in'
    >
      <App />
    </ClerkProvider>
  ) : (
    <p role='alert'>Recipe Saver needs its Clerk publishable key configured.</p>
  )
)
// The app ships no service worker; remove any stale registration so cached pages
// cannot mask a release.
if ('serviceWorker' in navigator)
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      registrations.forEach((registration) => registration.unregister())
    )
