// Runs in its own Bun process (see package.json) so DOM globals and auth-client
// modules do not share a module cache with the server tests.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'

const browser = new Window({ url: 'https://recipes.auth.test/profile' })
const originalGlobals = new Map<string, PropertyDescriptor | undefined>()
const originalFetch = globalThis.fetch
let registerOptionsRequests = 0
let signOuts = 0
let signedIn = true
let root: Root | undefined

before(() => {
  const globals = {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    HTMLElement: browser.HTMLElement,
    HTMLInputElement: browser.HTMLInputElement,
    Node: browser.Node,
    Element: browser.Element,
    Event: browser.Event,
    InputEvent: browser.InputEvent,
    // Radix dialogs dispatch these when they open and trap focus.
    CustomEvent: browser.CustomEvent,
    FocusEvent: browser.FocusEvent,
    KeyboardEvent: browser.KeyboardEvent,
    HTMLButtonElement: browser.HTMLButtonElement,
    HTMLDivElement: browser.HTMLDivElement,
    MutationObserver: browser.MutationObserver,
    ResizeObserver: browser.ResizeObserver,
    getComputedStyle: browser.getComputedStyle.bind(browser),
    requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
    cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
    IS_REACT_ACT_ENVIRONMENT: true
  }
  for (const [key, value] of Object.entries(globals)) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, value })
  }
  globalThis.fetch = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      browser.location.origin
    )
    if (url.pathname === '/api/auth/get-session')
      return Response.json(
        signedIn
          ? {
              session: { id: 's', userId: 'u', expiresAt: '2099-01-01' },
              user: {
                id: 'u',
                name: 'Cook',
                email: 'cook@example.com',
                emailVerified: true
              }
            }
          : null
      )
    if (url.pathname === '/api/auth/passkey/generate-register-options') {
      registerOptionsRequests++
      // What production returned: the session is older than freshAge (1 h).
      return Response.json(
        { message: 'Session is not fresh', code: 'SESSION_NOT_FRESH' },
        { status: 403, statusText: 'Forbidden' }
      )
    }
    if (url.pathname === '/api/auth/sign-out') {
      signOuts++
      signedIn = false
      return Response.json({ success: true })
    }
    if (url.pathname === '/api/auth/passkey/list-user-passkeys')
      return Response.json([])
    return originalFetch(input, init)
  }) as typeof fetch
})

after(async () => {
  // Nanostores delays session-store unmount cleanup by one second.
  await new Promise((resolve) => setTimeout(resolve, 1100))
  globalThis.fetch = originalFetch
  await browser.happyDOM.abort()
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

function browserEvent(type: string, cancelable = false): Event {
  // Happy DOM's Event implements the DOM contract with a separate TS type.
  return new browser.Event(type, {
    bubbles: true,
    cancelable
  }) as unknown as Event
}

test('adding a passkey with a stale session offers "Sign in again" and returns to the profile', async () => {
  const { createRoot } = await import('react-dom/client')
  const { QueryClient } = await import('@tanstack/react-query')
  const { authClient } = await import('../lib/auth-client')
  const { AuthProvider } = await import('../components/auth/auth-provider')
  const { passkeyPlugin } = await import('../lib/auth/passkey-plugin')
  const { AddPasskeyDialog } =
    await import('../components/auth/passkey/add-passkey-dialog')
  const navigations: string[] = []
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  const container = browser.document.createElement('div')
  browser.document.body.appendChild(container)
  root = createRoot(container as unknown as HTMLElement)
  try {
    await act(async () => {
      root!.render(
        createElement(
          AuthProvider,
          {
            authClient,
            queryClient,
            navigate: ({ to }: { to: string }) => {
              navigations.push(to)
            },
            emailAndPassword: { enabled: false },
            plugins: [passkeyPlugin()]
          } as never,
          createElement(AddPasskeyDialog, {
            open: true,
            onOpenChange: () => {}
          })
        )
      )
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    // The dialog renders in a portal on document.body.
    const dialog = () => document.querySelector('[role="dialog"]')!
    assert.ok(dialog(), 'Add passkey dialog missing')
    const name = dialog().querySelector<HTMLInputElement>('input[name="name"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        browser.HTMLInputElement.prototype,
        'value'
      )!.set!.call(name, '1Password')
      name.dispatchEvent(browserEvent('input'))
    })
    await act(async () => {
      dialog()
        .querySelector('form')!
        .dispatchEvent(browserEvent('submit', true))
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    assert.equal(registerOptionsRequests, 1)
    // Before the fix the 403 resolved as { error }, so the form stayed put
    // with no message and no way forward.
    assert.ok(
      !dialog().querySelector('input[name="name"]'),
      'Dialog stayed on the form after SESSION_NOT_FRESH'
    )
    const signInAgain = Array.from(dialog().querySelectorAll('button')).find(
      (button) => /sign in again/i.test(button.textContent ?? '')
    )
    assert.ok(signInAgain, 'Sign in again button missing')
    await act(async () => {
      signInAgain.click()
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    assert.equal(signOuts, 1)
    assert.deepEqual(navigations, [
      '/auth/sign-in?reauthenticate=true&redirectTo=%2Fprofile'
    ])
  } finally {
    await act(async () => root!.unmount())
  }
})
