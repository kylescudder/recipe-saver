import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'
import type { Database } from './db'
import { resolve } from 'node:path'
export function createApp({
  sql,
  checkHealth,
  authenticate,
  origin,
  revision
}: {
  sql: Database
  checkHealth: () => Promise<void>
  authenticate: (request: Request) => Promise<string | null>
  origin: string
  revision: string
}) {
  const dist = resolve('dist')
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    let response: Response
    if (url.pathname === '/healthz') {
      try {
        await checkHealth()
        response = Response.json({ ok: true, revision })
      } catch {
        response = Response.json({ ok: false }, { status: 503 })
      }
    } else if (url.pathname.startsWith('/api/trpc/')) {
      if (
        request.headers.has('origin') &&
        request.headers.get('origin') !== origin
      )
        response = new Response('Forbidden', { status: 403 })
      else {
        let userId: string | null = null
        try {
          userId = await authenticate(request)
        } catch {
          /* authentication fails closed */
        }
        response = await fetchRequestHandler({
          endpoint: '/api/trpc',
          req: request,
          router: appRouter,
          createContext: () => ({ sql, userId })
        })
      }
    } else if (url.pathname.startsWith('/api/'))
      response = new Response('Not found', { status: 404 })
    else if (!['GET', 'HEAD'].includes(request.method))
      response = new Response('Method not allowed', { status: 405 })
    else {
      const path = resolve(dist, '.' + url.pathname)
      const file = Bun.file(path)
      if (path.startsWith(dist + '/') && (await file.exists()))
        response = new Response(request.method === 'HEAD' ? null : file, {
          headers: { 'Content-Type': file.type }
        })
      else if (
        ['/', '/recipes', '/sign-in', '/sign-up'].includes(url.pathname) ||
        /^\/sign-(in|up)\//.test(url.pathname)
      )
        response = new Response(
          request.method === 'HEAD'
            ? null
            : Bun.file(resolve(dist, 'index.html')),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      else response = new Response('Not found', { status: 404 })
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
