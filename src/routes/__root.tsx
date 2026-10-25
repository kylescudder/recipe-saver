import { useEffect, useState, type ReactNode } from 'react'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute
} from '@tanstack/react-router'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@/server/router'
import { TRPCProvider } from '@/lib/trpc'
import Topbar from '@/components/shared/Topbar'
import RecipeBook from '@/components/RecipeBook'
import { OpeningBook } from '@/components/auth'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/globals.css'
import '@fontsource-variable/lora'
import '@fontsource-variable/dm-sans'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'theme-color', content: '#294839' },
      {
        name: 'description',
        content: 'Save recipes from your favourite websites and cookbooks.'
      },
      { title: 'Recipe Saver' }
    ],
    links: [
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml', sizes: 'any' },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
        sizes: '180x180'
      }
    ]
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className='page-heading'>
      <h1>A missing page.</h1>
      <p>
        This page could not be found. <a href='/'>Return to your recipes</a>.
      </p>
    </div>
  )
})

function RootComponent() {
  useEffect(() => {
    // The app ships no service worker; remove any stale registration so cached
    // pages cannot mask a release.
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          registrations.forEach((registration) => registration.unregister())
        )
  }, [])
  return (
    <ClerkProvider
      signInUrl='/sign-in'
      signUpUrl='/sign-up'
      afterSignOutUrl='/sign-in'
    >
      <App />
    </ClerkProvider>
  )
}

function App() {
  const { isLoaded, userId } = useAuth()
  if (!isLoaded) return <OpeningBook />
  // A fresh provider per identity isolates cached household data without
  // cancelling the new identity's active queries during its first render.
  return <SessionApp key={userId ?? 'signed-out'} />
}

function SessionApp() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } })
  )
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: '/api/trpc' })]
    })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
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
          <Toaster />
        </ThemeProvider>
      </TRPCProvider>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
