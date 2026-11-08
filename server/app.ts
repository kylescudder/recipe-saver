import { resolve } from 'node:path'

type Handler = (request: Request) => Response | Promise<Response>

// Bun accepts bodies up to the photo upload limit (see index.ts). Everything
// except the photo endpoint keeps the original 64 KiB cap.
export const maxRequestBody = 65536
export const maxUploadBody = 2 * 1024 * 1024 + 65536
const uploadPath = '/api/profile/avatar'

function limitBody(request: Request, limit: number): Request | null {
  if (!request.body) return request
  const length = request.headers.get('content-length')
  if (length !== null) return Number(length) > limit ? null : request
  // Chunked bodies have no declared length, so count them as they stream.
  let size = 0
  const counted = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength
        if (size > limit) controller.error(new Error('Body too large'))
        else controller.enqueue(chunk)
      }
    })
  )
  return new Request(request, { body: counted, duplex: 'half' } as RequestInit)
}

// Health, static assets and response headers around the TanStack Start app.
export function createApp({
  app,
  checkHealth,
  origin,
  revision,
  clientDirectory = resolve('dist/client')
}: {
  app: Handler
  checkHealth: () => Promise<void>
  origin: string
  revision: string
  clientDirectory?: string
}) {
  return async (incoming: Request): Promise<Response> => {
    const url = new URL(incoming.url)
    const request = limitBody(
      incoming,
      url.pathname === uploadPath ? maxUploadBody : maxRequestBody
    )
    let response: Response
    if (!request) response = new Response('Payload too large', { status: 413 })
    else if (url.pathname === '/healthz') {
      try {
        await checkHealth()
        response = Response.json({ ok: true, revision })
      } catch {
        response = Response.json({ ok: false }, { status: 503 })
      }
    } else if (
      url.pathname.startsWith('/api/trpc/') ||
      // Better Auth endpoints and the profile photo; both routes return 404
      // under Clerk.
      url.pathname.startsWith('/api/auth/') ||
      url.pathname === uploadPath
    ) {
      if (
        request.headers.has('origin') &&
        request.headers.get('origin') !== origin
      )
        response = new Response('Forbidden', { status: 403 })
      else response = await app(request)
    } else if (url.pathname.startsWith('/api/'))
      response = new Response('Not found', { status: 404 })
    else if (!['GET', 'HEAD'].includes(request.method))
      response = new Response('Method not allowed', { status: 405 })
    else {
      const path = resolve(clientDirectory, '.' + url.pathname)
      const file = Bun.file(path)
      if (
        url.pathname !== '/' &&
        path.startsWith(clientDirectory + '/') &&
        (await file.exists())
      )
        response = new Response(request.method === 'HEAD' ? null : file, {
          headers: { 'Content-Type': file.type }
        })
      else if (url.pathname.startsWith('/assets/'))
        response = new Response('Not found', { status: 404 })
      else response = await app(request)
    }
    response.headers.set('X-Recipe-Saver-Revision', revision)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set(
      'Cache-Control',
      url.pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-store'
    )
    return response
  }
}
