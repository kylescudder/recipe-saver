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

## Herman production

See [deploy/README.md](deploy/README.md) for the private container, database,
Clerk configuration, central deploy-core registration, CI/CD and rollback procedure.
