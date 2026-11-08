import { avatarRequest, prepareAvatar } from './profile'

// Optional name parts and the read-only verified email.
export const profileFields = [
  {
    name: 'givenName',
    type: 'string' as const,
    label: 'First name',
    defaultValue: '',
    validateDebounceMs: 0,
    validate: (value: unknown) => {
      if (typeof value === 'string' && value.length > 100)
        throw new Error('Use up to 100 characters.')
    }
  },
  {
    name: 'familyName',
    type: 'string' as const,
    label: 'Last name',
    defaultValue: '',
    validateDebounceMs: 0,
    validate: (value: unknown) => {
      if (typeof value === 'string' && value.length > 100)
        throw new Error('Use up to 100 characters.')
    }
  },
  {
    name: 'email',
    type: 'string' as const,
    label: 'Verified email',
    readOnly: true,
    copyable: true
  }
]

// The photo lives in the app's Postgres behind /api/profile/avatar. Upload and
// removal change the stored photo first; update-user then only confirms it.
export const profileAvatar = {
  enabled: true,
  size: 512,
  extension: 'jpg' as const,
  resize: async (file: File) =>
    new File([await prepareAvatar(file)], 'avatar.jpg', { type: 'image/jpeg' }),
  upload: async (file: File) => {
    const image = await avatarRequest({
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: file
    })
    if (!image) throw new Error('The photo could not be uploaded.')
    return image
  },
  delete: async () => {
    await avatarRequest({ method: 'DELETE' })
  }
}
