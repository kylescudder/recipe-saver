import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import type { Orm } from './db'
import { authUser } from './auth-schema'
import { userProfile } from './profile-schema'
import { isVerifiedAllowedUser } from './auth-policy'
import type { SessionUser } from './auth-factory'

type Settings = {
  origin: string
  allowedEmails: readonly string[]
  getSession: (headers: Headers) => Promise<{ user: SessionUser } | null>
}

export const avatarPath = '/api/profile/avatar'
export const maxAvatarUpload = 2 * 1024 * 1024
export const avatarUrl = (version: string) => avatarPath + '?v=' + version

const privateHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin'
}

class ProfileError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit)
    throw new ProfileError(413, 'This upload is too large.')
  const reader = request.body?.getReader()
  if (!reader) throw new ProfileError(400, 'Request body is required.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new ProfileError(413, 'This upload is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}

// Checks magic bytes, so nothing else ever reaches the image decoder.
function sniffFormat(body: Buffer) {
  if (body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg'
  if (body.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'png'
  if (
    body.subarray(0, 4).toString('ascii') === 'RIFF' &&
    body.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'webp'
  return null
}

// GET, PUT and DELETE on /api/profile/avatar for the signed-in user's own
// photo. Access follows the app rule: a verified email that is still invited.
export function createProfileHandler(database: Orm, settings: Settings) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: privateHeaders })
  const currentImage = async (userId: string) => {
    const [row] = await database
      .select({ version: userProfile.avatarVersion })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
    return { image: row?.version ? avatarUrl(row.version) : null }
  }
  return async (request: Request) => {
    try {
      if (new URL(request.url).pathname !== avatarPath)
        return json({ error: 'Not found' }, 404)
      if (
        request.method !== 'GET' &&
        (request.headers.get('origin') !== settings.origin ||
          request.headers.get('sec-fetch-site') === 'cross-site')
      )
        return json({ error: 'Cross-site request refused' }, 403)
      const session = await settings.getSession(request.headers)
      if (!session)
        return json({ error: 'Please sign in to manage your profile.' }, 401)
      if (!isVerifiedAllowedUser(session.user, settings.allowedEmails))
        return json({ error: 'Sign in with an invited email first.' }, 403)
      const userId = session.user.id
      if (request.method === 'GET') {
        const [row] = await database
          .select({ avatar: userProfile.avatar })
          .from(userProfile)
          .where(eq(userProfile.userId, userId))
        if (!row?.avatar) return json({ error: 'No profile photo' }, 404)
        return new Response(new Uint8Array(row.avatar), {
          headers: {
            ...privateHeaders,
            'Content-Type': 'image/jpeg',
            'Content-Security-Policy': "default-src 'none'; sandbox"
          }
        })
      }
      if (request.method === 'PUT') {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(
            request.headers.get('content-type')?.split(';')[0] ?? ''
          )
        )
          throw new ProfileError(415, 'Choose a JPEG, PNG or WebP photo.')
        const body = await readBody(request, maxAvatarUpload)
        const format = sniffFormat(body)
        if (!format)
          throw new ProfileError(400, 'Choose a valid JPEG, PNG or WebP photo.')
        let avatar: Buffer
        try {
          const image = sharp(body, {
            failOn: 'error',
            limitInputPixels: 4_000_000,
            animated: false
          })
          const metadata = await image.metadata()
          if (metadata.format !== format || (metadata.pages ?? 1) > 1)
            throw new Error('Unsupported image')
          // Re-encode, which drops EXIF/GPS and any active content.
          avatar = await image
            .rotate()
            .resize(256, 256, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer()
        } catch {
          throw new ProfileError(
            400,
            'This photo could not be read. Choose a different JPEG, PNG or WebP image.'
          )
        }
        const avatarVersion = randomUUID()
        await database.transaction(async (tx) => {
          await tx
            .insert(userProfile)
            .values({ userId, avatar, avatarVersion })
            .onConflictDoUpdate({
              target: userProfile.userId,
              set: { avatar, avatarVersion, updatedAt: new Date() }
            })
          await tx
            .update(authUser)
            .set({ image: avatarUrl(avatarVersion), updatedAt: new Date() })
            .where(eq(authUser.id, userId))
        })
        return json(await currentImage(userId))
      }
      if (request.method === 'DELETE') {
        await database.transaction(async (tx) => {
          await tx
            .update(userProfile)
            .set({ avatar: null, avatarVersion: null, updatedAt: new Date() })
            .where(eq(userProfile.userId, userId))
          await tx
            .update(authUser)
            .set({ image: null, updatedAt: new Date() })
            .where(eq(authUser.id, userId))
        })
        return json(await currentImage(userId))
      }
      return json({ error: 'Method not allowed' }, 405)
    } catch (error) {
      if (error instanceof ProfileError)
        return json({ error: error.message }, error.status)
      // Never expose database or authentication details in errors.
      return json(
        { error: 'Unable to update your profile photo. Please try again.' },
        500
      )
    }
  }
}
