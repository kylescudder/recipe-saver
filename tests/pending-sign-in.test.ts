import { afterAll, beforeEach, expect, test } from 'bun:test'
import {
  clearPendingSignIn,
  emailCodeLifetime,
  readPendingSignIn,
  savePendingSignIn
} from '../src/lib/pending-sign-in'

const store = new Map<string, string>()
let blocked = false
const storage = {
  getItem: (key: string) => {
    if (blocked) throw new Error('blocked')
    return store.get(key) ?? null
  },
  setItem: (key: string, value: string) => {
    if (blocked) throw new Error('blocked')
    store.set(key, value)
  },
  removeItem: (key: string) => {
    if (blocked) throw new Error('blocked')
    store.delete(key)
  }
}
const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { sessionStorage: storage }
})
afterAll(() => {
  if (original) Object.defineProperty(globalThis, 'window', original)
  else delete (globalThis as { window?: unknown }).window
})
beforeEach(() => {
  blocked = false
  store.clear()
})

test('email-code progress keeps only the email and send time', () => {
  const now = Date.now()
  savePendingSignIn({ email: 'cook@example.com', sentAt: now })
  expect(readPendingSignIn(now + 1000)).toEqual({
    email: 'cook@example.com',
    sentAt: now
  })
  const stored = JSON.parse([...store.values()][0]!)
  expect(Object.keys(stored).sort()).toEqual(['email', 'sentAt'])
  clearPendingSignIn()
  expect(readPendingSignIn(now)).toBeNull()
})

test('expired, future and malformed progress is discarded', () => {
  const now = Date.now()
  savePendingSignIn({ email: 'cook@example.com', sentAt: now })
  expect(readPendingSignIn(now + emailCodeLifetime)).toBeNull()
  expect(store.size).toBe(0)
  savePendingSignIn({ email: 'cook@example.com', sentAt: now + 60_000 })
  expect(readPendingSignIn(now)).toBeNull()
  store.set('recipe-saver.pending-email-sign-in.v1', '{"email":"x"}')
  expect(readPendingSignIn(now)).toBeNull()
  store.set('recipe-saver.pending-email-sign-in.v1', 'not json')
  expect(readPendingSignIn(now)).toBeNull()
})

test('blocked storage never throws', () => {
  blocked = true
  expect(() =>
    savePendingSignIn({ email: 'cook@example.com', sentAt: Date.now() })
  ).not.toThrow()
  expect(readPendingSignIn()).toBeNull()
  expect(() => clearPendingSignIn()).not.toThrow()
})
