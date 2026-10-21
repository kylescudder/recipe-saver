import { SignOutButton, useAuth } from '@clerk/react'
import { Button } from '../ui/button'
export default function Logout() {
  const { isSignedIn } = useAuth()
  return isSignedIn ? (
    <SignOutButton>
      <Button variant='ghost'>Logout</Button>
    </SignOutButton>
  ) : null
}
