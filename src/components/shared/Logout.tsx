import { SignOutButton, useAuth } from '@clerk/tanstack-react-start'
import { Button } from '../ui/button'

// Clerk mode only; Better Auth uses the avatar menu instead.
export default function Logout() {
  const { isSignedIn } = useAuth()
  return isSignedIn ? (
    <SignOutButton>
      <Button variant='ghost' className='logout-button'>
        Sign out
      </Button>
    </SignOutButton>
  ) : null
}
