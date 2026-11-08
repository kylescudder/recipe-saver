import { afterAll, afterEach, expect, spyOn, test } from 'bun:test'
import { prepareAvatar } from '../src/lib/profile'
import { profileAvatar } from '../src/lib/profile-ui'

const calls: { url: string; init?: RequestInit }[] = []
let reply = () => Response.json({ image: '/api/profile/avatar?v=next' })
const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
  Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      calls.push({ url: String(input), init })
      return reply()
    },
    { preconnect: globalThis.fetch.preconnect }
  )
)

afterAll(() => fetchSpy.mockRestore())

afterEach(() => {
  calls.length = 0
  reply = () => Response.json({ image: '/api/profile/avatar?v=next' })
})

test('the photo uploads as JPEG to the private endpoint and returns its URL', async () => {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'avatar.jpg', {
    type: 'image/jpeg'
  })
  expect(await profileAvatar.upload(file)).toBe('/api/profile/avatar?v=next')
  expect(calls).toHaveLength(1)
  expect(calls[0]!.url).toBe('/api/profile/avatar')
  expect(calls[0]!.init).toMatchObject({
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: file
  })
  expect(profileAvatar).toMatchObject({ enabled: true, extension: 'jpg' })
})

test('server errors reach the user and removal calls DELETE', async () => {
  reply = () =>
    Response.json({ error: 'This upload is too large.' }, { status: 413 })
  await expect(
    profileAvatar.upload(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  ).rejects.toThrow('This upload is too large.')
  reply = () => Response.json({ image: null })
  await expect(
    profileAvatar.upload(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  ).rejects.toThrow('could not be uploaded')
  await profileAvatar.delete()
  expect(calls.at(-1)).toMatchObject({
    url: '/api/profile/avatar',
    init: { method: 'DELETE' }
  })
})

test('the browser refuses other types and very large files before decoding', async () => {
  await expect(
    prepareAvatar(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))
  ).rejects.toThrow('JPEG, PNG or WebP')
  await expect(
    prepareAvatar(
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'a.png', {
        type: 'image/png'
      })
    )
  ).rejects.toThrow('smaller than 10 MB')
})
