# Recipe Saver

Save website recipes and cookbook page references in a shared household collection.

React/Vite runs with TanStack Router, Query and Table. A typed tRPC API runs on Bun,
Clerk authenticates every profile/recipe procedure, and PostgreSQL persists recipes
and profiles. Recipe access requires an onboarded Clerk session. The household
collection is shared between onboarded users.

## Development

Use Bun 1.3.14 and a local PostgreSQL database. Copy `.env.example` to `.env`, set
`APP_ORIGIN=http://localhost:5173`, use the existing Recipe Saver Clerk instance,
and use a local database URL. Set the same publishable key in
`CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`. Never commit `.env`.

```sh
bun install --frozen-lockfile
bun run db:migrate # local development owner connection only
bun run dev:server
# In a second terminal:
bun run dev
```

`bun run typecheck`, `bun run build` and `bun run format:check` validate the app.
`TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres bun run test`
uses a **disposable** PostgreSQL service with trust authentication, creates isolated
owner/runtime roles and databases, and removes them afterward. Do not point this
at Herman's shared production administrator connection.

## Browser tests

`bun run test:e2e` runs the Playwright journeys against a running local frontend
and API. It covers website and cookbook saves, validation, reload persistence,
search, archive, sorting, pagination, column visibility, appearance, keyboard
focus, signed-out access and onboarding at desktop and mobile widths.

Use the existing Clerk **development** instance and a dedicated test login. Set
`E2E_USERNAME` and `E2E_PASSWORD` privately in the environment, plus
`E2E_DATABASE_URL` for the same disposable local database used by the API. Its
database name must start with `recipe_e2e` or `recipe_redesign`. Tests delete local
profiles and recipes to exercise onboarding and empty states. They do not create
Clerk accounts. `E2E_BASE_URL` defaults to `http://localhost:5174`; set `APP_ORIGIN`
to the same address when starting the API.

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
