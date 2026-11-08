// Recipe Saver is invite-only: an account must have a verified email that is
// still on AUTH_ALLOWED_EMAILS. Removing an address revokes access at once.
export function isAllowedEmail(
  email: string,
  allowedEmails: readonly string[]
) {
  return allowedEmails.includes(email.trim().toLowerCase())
}

export function isVerifiedAllowedUser(
  user: { email: string; emailVerified: boolean } | null | undefined,
  allowedEmails: readonly string[]
) {
  return !!user?.emailVerified && isAllowedEmail(user.email, allowedEmails)
}
