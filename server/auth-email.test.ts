import { expect, test } from 'bun:test'
import { renderCodeEmail, renderLinkEmail } from '../src/server/auth-email'

const origin = 'https://recipes.auth.test'

test('auth emails are branded, escape links and only link to this site', () => {
  const code = renderCodeEmail(origin, '123456')
  expect(code.subject).toBe('123456 is your Recipe Saver sign-in code')
  expect(code.html).toContain(`src="${origin}/email-logo.png"`)
  expect(code.html).toContain('width="40"')
  expect(code.html).toContain('Recipe Saver')
  expect(code.html).toContain('#294839')
  expect(code.html).toContain('>123456<')
  expect(code.text).toContain('123456')
  expect(code.text).toContain('10 minutes')
  expect(() => renderCodeEmail(origin, '12345<')).toThrow()
  expect(() => renderCodeEmail(origin, '1234567')).toThrow()

  const url = `${origin}/api/auth/magic-link/verify?token=abc&callbackURL=%2F"x`
  const link = renderLinkEmail(origin, 'magic-link', url)
  expect(link.subject).toBe('Your Recipe Saver sign-in link')
  // URL parsing percent-encodes the quote; & is HTML-escaped in attributes.
  expect(link.html).toContain('token=abc&amp;callbackURL=%2F%22x')
  expect(link.html).not.toContain('callbackURL=%2F"x')
  expect(link.text).toContain(new URL(url).href)
  expect(link.html).toContain('10 minutes')

  const reset = renderLinkEmail(
    origin,
    'reset-password',
    `${origin}/api/auth/reset-password/t`
  )
  expect(reset.subject).toBe('Set your Recipe Saver password')
  expect(reset.html).toContain('30 minutes')

  expect(() =>
    renderLinkEmail(origin, 'magic-link', 'https://attacker.example/verify')
  ).toThrow('Unexpected sign-in link origin')
})
