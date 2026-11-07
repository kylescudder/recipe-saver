# Third-party component notices

The Better Auth UI shadcn components were installed from its official `radix-nova` registry, using the adapted copies from Suggestions (7 November 2026). They are copied into `src/components/auth` (registry primitives in `src/components/auth/ui`, kept apart from Recipe Saver's existing `src/components/ui`) and `src/lib/auth`, as intended by the shadcn distribution model. Local adaptations connect TanStack Router, keep profile drafts after saving, hide the avatar editor (Recipe Saver stores no photos), remove sign-up links because sign-up is disabled, return sign-out to the homepage and restrict redirects to same-site paths. The EmailOtp card and OtpField keep tab-scoped email/request-time recovery, wall-clock cooldown/expiry, explicit code verification and a generic invite-only message. Social, sign-up, email-change and email-code password-reset views are not used. The cards are restyled with Recipe Saver's colours and type.

## Better Auth UI

Source: https://raw.githubusercontent.com/better-auth-ui/better-auth-ui/main/LICENSE

```text
MIT License

Copyright (c) 2025 daveycodez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## shadcn/ui

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
