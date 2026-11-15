# Recipe Saver

Save website recipes and cookbook page references in a shared household collection.

A TanStack Start app (Router, Query and Table) with a typed tRPC API, served by Bun.
[Better Auth](https://better-auth.com) authenticates every recipe procedure, and
PostgreSQL persists recipes through [Drizzle](https://orm.drizzle.team).
Recipe access requires a signed-in session. The household collection is shared
between signed-in users.

Sign-in is invite-only (`AUTH_ALLOWED_EMAILS`), with email codes, magic links,
passwords and passkeys. See [deploy/README.md](deploy/README.md#authentication).

## Development

Use Bun 1.4.4 and a local PostgreSQL database. Copy `.env.example` to `.env`, set
`APP_ORIGIN` and `BETTER_AUTH_URL` to `http://localhost:5173`, use a local
database URL, a random `BETTER_AUTH_SECRET` of at least 32 characters, a Brevo
key and sender for sign-in emails, and your own address in `AUTH_ALLOWED_EMAILS`.
Never commit `.env`.

```sh
bun install --frozen-lockfile
bun run db:migrate # local development owner connection only
bun run dev
```

The schema is in `src/server/schema.ts`; run `bun run db:generate` after changing it
to add a migration to `drizzle/`.

`bun run typecheck`, `bun run build` and `bun run format:check` validate the app.
Run `bun run build` before `bun run test`: the HTTP test serves pages from the build.
`TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres bun run test`
uses a **disposable** PostgreSQL service with trust authentication, creates isolated
owner/runtime roles and databases, and removes them afterward. Do not point this
at Herman's shared production administrator connection.

## Browser tests

`bun run test:e2e` runs the Playwright journeys against the production build. It
covers website and cookbook saves, validation, reload persistence,
search, archive, sorting, pagination, column visibility, appearance, keyboard
focus and signed-out access at desktop and mobile widths.

It needs no setup beyond Homebrew Postgres (`brew install postgresql@18`).
`e2e/run.ts` creates a throwaway Postgres cluster on a free port, migrates it,
seeds a throwaway verified user with a random password, builds the app and lets
Playwright start `bun run start` against that database. The cluster and its
directory are deleted afterwards, and the credentials never leave the process.
No production data, account or email delivery is involved.

To reuse a database you manage, set `E2E_DATABASE_URL` to a disposable local
database whose name starts with `recipe_e2e` or `recipe_redesign`; tests delete
local recipes to exercise empty states. `E2E_SKIP_BUILD=1` skips the build when
`dist/` is current. Arguments are passed to Playwright
(`bun run test:e2e --grep cookbook`). To target a server you started yourself,
run `bunx --no-install playwright test` with `E2E_BASE_URL`, `E2E_DATABASE_URL`,
`E2E_USERNAME` and `E2E_PASSWORD` set.

Global setup validates the disposable PostgreSQL URL before launching a browser
or signing in. The setup guard tests run as part of `bun run test`, or standalone
without a database or login using `bun test tests/e2e-setup.test.ts`.

```sh
bunx --no-install playwright install chromium
bun run test:e2e
```

Reports and screenshots are written under ignored `state/design-overhaul/`.
Login is excluded from screenshots and traces; the saved browser session is
private and ignored. Network-failure tests deliberately interrupt individual RPC
requests; successful saves and reloads use the real API and PostgreSQL.

## Herman production

See [deploy/README.md](deploy/README.md) for the private container, database,
authentication settings, central deploy-core registration, CI/CD and rollback
procedure.

## Runtime configuration

Server settings are validated with `@t3-oss/env-core` and Zod when they are read.
Production builds need no runtime credentials. Invalid settings report their names
without logging secret values; see `.env.example` for the deployment settings.
Migration commands validate database settings independently of auth configuration.

`bun run test:e2e:components` checks the real UI primitives in an isolated browser fixture without sign-in credentials. The `test:e2e` suite verifies authenticated application journeys with the test account above.
