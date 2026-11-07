// Optional name parts and the read-only verified email. Recipe Saver has no
// file storage, so profile photos are not offered.
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
