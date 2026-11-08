import { UserRound } from 'lucide-react'
import { UserButton } from '@/components/auth/user/user-button'
import { BetterAuthUIProvider } from '@/components/BetterAuthUIProvider'

// Loaded only for signed-in cooks, keeping the auth UI out of other pages.
export function BetterAuthUserMenu() {
  return (
    <BetterAuthUIProvider>
      <UserButton
        size='icon'
        align='end'
        hideSettings
        className='ring-primary/30 hover:ring-primary/60 ring-2'
        links={[
          {
            label: 'Profile',
            href: '/profile',
            icon: <UserRound />,
            visibility: 'authenticated'
          }
        ]}
      />
    </BetterAuthUIProvider>
  )
}
