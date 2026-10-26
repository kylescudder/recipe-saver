# Recipe Saver

Save website recipes and cookbook page references in a shared household collection.

A TanStack Start app (Router, Query and Table) with a typed tRPC API, served by Bun.
Clerk authenticates every recipe procedure, and PostgreSQL persists recipes
through [Drizzle](https://orm.drizzle.team).
Recipe access requires a Clerk session. The household collection is shared between
signed-in users.

## Development

Use Bun 1.4.4 and a local PostgreSQL database. Copy `.env.example` to `.env`, set
`APP_ORIGIN=http://localhost:5173`, use the existing Recipe Saver Clerk instance,
and use a local database URL. Never commit `.env`.

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

`bun run test:e2e` runs the Playwright journeys against a running local frontend
and API. It covers website and cookbook saves, validation, reload persistence,
search, archive, sorting, pagination, column visibility, appearance, keyboard
focus and signed-out access at desktop and mobile widths.

Use the existing Clerk **development** instance and a dedicated test login. Set
`E2E_USERNAME` and `E2E_PASSWORD` privately in the environment, plus
`E2E_DATABASE_URL` for the same disposable local database used by the API. Its
database name must start with `recipe_e2e` or `recipe_redesign`. Tests delete local
recipes to exercise empty states. They do not create Clerk accounts. `E2E_BASE_URL` defaults to `http://localhost:5174`; start the app there
(`bun run dev --port 5174`) with `APP_ORIGIN` set to the same address.

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
Clerk configuration, central deploy-core registration, CI/CD and rollback procedure.

## Runtime configuration

Server settings are validated with `@t3-oss/env-core` and Zod when they are read.
Production builds need no runtime credentials. Invalid settings report their names
without logging secret values; see `.env.example` for the deployment settings.
Migration commands validate database settings independently of Clerk configuration.

`bun run test:e2e:components` checks the real UI primitives in an isolated browser fixture without Clerk credentials. The existing `test:e2e` suite still verifies authenticated application journeys with a Clerk development test login.
