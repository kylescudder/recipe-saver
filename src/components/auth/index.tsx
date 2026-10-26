import type { ReactNode } from 'react'
import { RedirectToSignIn, useAuth } from '@clerk/tanstack-react-start'
import { Book } from 'lucide-react'

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
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <OpeningBook />
  return isSignedIn ? children : <RedirectToSignIn />
}
