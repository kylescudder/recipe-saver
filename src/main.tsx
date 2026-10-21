import React, { useEffect, useState } from 'react'
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
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/sonner'
import './styles/globals.css'

function Authenticated({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <p role='status'>Loading…</p>
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
      <h1 className='mb-6 text-3xl font-bold'>Complete your profile</h1>
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
      <Topbar />
      <main className='mx-auto w-full max-w-4xl px-6 py-12'>
        <Outlet />
      </main>
    </>
  ),
  notFoundComponent: () => <p>Page not found.</p>
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
    <SignIn routing='hash' signUpUrl='/sign-up' forceRedirectUrl='/' />
  )
})
const signUp = createRoute({
  getParentRoute: () => root,
  path: '/sign-up/$',
  component: () => (
    <SignUp routing='hash' signInUrl='/sign-in' forceRedirectUrl='/' />
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
  const { getToken, userId } = useAuth()
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
  useEffect(() => {
    queryClient.clear()
  }, [userId, queryClient])
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
// Retire the old Next/Serwist worker so cached pages cannot mask this release.
if ('serviceWorker' in navigator)
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      registrations.forEach((registration) => registration.unregister())
    )
