import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { trpc } from '@/lib/trpc'
import type { IUser } from '@/lib/models/user'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
export default function AccountProfile({
  user,
  btnTitle
}: {
  user: IUser
  btnTitle: string
}) {
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [bio, setBio] = useState(user.bio)
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const save = trpc.profile.save.useMutation({
    onSuccess: async () => {
      await utils.profile.me.invalidate()
      await navigate({ to: '/' })
    },
    onError: () =>
      toast.error(
        'Could not save your profile. Check your username and try again.'
      )
  })
  return (
    <form
      className='flex flex-col gap-4'
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate({ name, username, bio, image: user.image })
      }}
    >
      <label htmlFor='name'>Name</label>
      <Input
        id='name'
        required
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label htmlFor='username'>Username</label>
      <Input
        id='username'
        required
        minLength={3}
        maxLength={200}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <label htmlFor='bio'>Bio</label>
      <Textarea
        id='bio'
        maxLength={2000}
        value={bio}
        onChange={(event) => setBio(event.target.value)}
      />
      <Button type='submit' disabled={save.isPending}>
        {btnTitle}
      </Button>
    </form>
  )
}
