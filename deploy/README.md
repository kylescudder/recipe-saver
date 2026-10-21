# Herman deployment

## Architecture and status

The target is `https://recipes.kylescudder.co.uk` on Herman. One unprivileged Bun
container serves the Vite build and `/api/trpc/*` at `recipe-saver:3000`. It joins
external `platform-web` and internal `platform-db`, publishes no host port, and
uses four pooled Postgres connections. Compose limits memory, CPU, processes and
logs, drops capabilities and uses a read-only root filesystem.

The database is `recipe_saver`; migrations/imports use `recipe_saver_owner` and the
application uses `recipe_saver_runtime`. The old shared household collection,
archived recipes, Mongo IDs and Clerk-linked profiles are retained by the import.
New records use UUIDs. All recipe RPCs require a verified Clerk session and an
onboarded profile; users can update only the profile identified by their session.

Adding these files does not complete a production cutover. The source repository
had no Herman installation, GitHub release credentials or variables. The fresh
`recipe_saver` database and scoped roles have now been provisioned on Herman and
registered for backups; the existing Clerk publishable key is configured in GitHub. Its recorded
Vercel homepage returned 404 during the audit. Kyle approved starting with a fresh database; historical Mongo data is optional.
Use the existing Recipe Saver Clerk instance, which was located in the authenticated
Clerk dashboard. Do not substitute another app's Clerk instance.

## One-time installation

Read `/Users/kyle/platform/runbook.md`, `postgres/operations.md`,
`caddy/onboarding.md` and `deploy-core/current/README.md` first. Verify the machine
is Herman and preserve unrelated registry entries and application routes.

1. Place a reviewed checkout of this repository at
   `/Users/kyle/platform/apps/recipe-saver`. Use the reviewed main commit for the
   active host tooling; application image releases never update host hooks.
2. From `/Users/kyle/platform`, run
   `python3 scripts/provision-project.py recipe_saver`. This creates the two
   restricted roles, grants and weekly encrypted NAS database backup registration.
   Password references remain under `projects/recipe_saver/` (0700 directory,
   0600 files); administrator credentials never reach the app or GitHub.
3. Create protected app directories `secrets/`, `state/`, `state/public/`,
   `deploy-spool/requests/`, `backups/` (0700). Create `.env` (0600) from
   `.env.example`, privately reading the runtime password reference and URL-encoding
   it. Set `APP_ORIGIN=https://recipes.kylescudder.co.uk`. Restore this app's existing
   `CLERK_SECRET_KEY` and matching public key. Credentials go directly to files or
   consuming processes; never print resolved Compose or connection strings.
4. The existing instance is development-only. Create its production environment
   and verify the hostname/domain before enabling production deployment. Use the
   Recipe Saver application so existing `clerk_id` values and sign-ins survive.
   Configure its application domain/origins and sign-in/sign-up URLs for the new
   hostname. Match the build's `VITE_CLERK_PUBLISHABLE_KEY` to the server's
   `CLERK_PUBLISHABLE_KEY`. Keep the existing registration/access policy.
5. **Optional historical import (not required for this rollout):** quiesce legacy writes and export **both** Mongo `recipes` and `users` collections
   using `mongoexport --jsonArray`. Store snapshots beneath app `secrets/`, mode
   0600, and include them in an encrypted off-host backup. Preserve all fields,
   archived rows and Clerk IDs. No production Mongo credential is available in
   this repository. Do not retire the old data source before verified acceptance.
6. Run the candidate's `bun server/migrate.ts` in an ephemeral container on
   `platform-db`, using a 0600 temporary owner environment file. Run
   `bun deploy/import-mongo.ts /source/recipes.json /source/users.json` the same
   way, mounting the snapshots read-only. Pass the owner URL via the temporary
   env-file; never on a command line. Skip the import command for a fresh database. Remove the temporary file afterward.
   Import validates the full source first, runs in one transaction, compares every
   imported field, and refuses changed existing records instead of overwriting
   them. Repeating an identical snapshot is safe. Keep the reported counts as
   verification evidence, compare them to source counts, and separately check
   active/archived counts and real sign-in before cutover.
7. Create `secrets/deploy-webhook-secret` (0600, at least 32 random characters),
   `.env.deploy-hook` (0600) with `DEPLOY_HOOK_USER=<queue-owner-uid>:<gid>`, and
   start the receiver:
   `docker compose -f deploy/compose.deploy-hook.yaml --env-file .env.deploy-hook up -d`.
   It has only its queue write mount and sanitized status read mount, no Docker
   socket, database network, host port or runtime credentials.
8. Protect the entire `deploy-recipe-saver.kylescudder.co.uk` hostname using a
   dedicated Cloudflare Access Service Auth token. Route **only**
   `/hooks/recipe-saver` to `recipe-saver-deploy-hook:9000` through the managed
   hostname tool: `python3 scripts/hostname.py add recipe-saver-deploy deploy-recipe-saver.kylescudder.co.uk --upstream recipe-saver-deploy-hook:9000 --path /hooks/recipe-saver` (dry-run first). Other authenticated
   paths must return 404; unauthenticated requests must be blocked by Access.
   Public app sign-in is handled by Clerk.
9. Add the object in `deploy/deploy-core-entry.json` to the installed central
   `deploy-core/apps.json` registry via atomic replacement (0600), preserving every
   existing entry. It starts disabled. Do not install another LaunchAgent, copy
   the engine into this repo or start a second scheduler. Set an initial attested
   `RECIPE_SAVER_IMAGE` digest in `.env`. Validate enabled prerequisites with:
   `python3 -B /Users/kyle/platform/deploy-core/current/deploy_service.py --config /Users/kyle/platform/deploy-core/apps.json validate`.
   Enable the entry only once the database, credentials and host files are ready.
10. Configure the GitHub `production` environment to allow **main only**. Store
    `DEPLOY_WEBHOOK_SECRET`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` there;
    no database or Clerk secret goes to GitHub. Set repository variables
    `VITE_CLERK_PUBLISHABLE_KEY`, `RECIPE_SAVER_BASE_URL=https://recipes.kylescudder.co.uk`
    and `DEPLOY_ENABLED=true`. Before the initial release, register the public
    hostname with `scripts/hostname.py add recipe-saver recipes.kylescudder.co.uk
--upstream recipe-saver:3000` only after the candidate is healthy; the release
    waits for this public endpoint. Do not edit the managed Caddy block manually.
11. Run the main-only Release workflow. Verify its attested digest and exact commit
    match `state/public/deployment.json` and the public `X-Recipe-Saver-Revision`
    header. Test real Clerk sign-in, existing profile recognition, recipe search,
    website/book save, archive, refresh and persistence after container restart.
    Archive evidence under the platform's `verification/`. Update its runbook and
    repository homepage after successful cutover.

## Automated releases and recovery

PR CI builds with the frozen lockfile, checks types/formatting, tests isolated
Postgres owner/runtime permissions, authenticated RPC CRUD and source import
preservation, tests the queue receiver, and builds the production image.

`release.yml` builds native AMD64/ARM64 images and publishes an immutable GHCR
manifest with GitHub provenance. Access plus HMAC protects the queue request.
The installed central deploy-core service independently verifies repository,
main branch, workflow provenance, image labels and commit, then backs up the
project database, runs owner migrations and switches the image. Health and
`deploy/verify.ts` acceptance must pass before the receiver exposes the completed
image/commit acknowledgement. The release job also requires that acknowledgement
and the public revision. Disabled deployment is bootstrap configuration, not
successful production deployment; the release build requires a Clerk public key.

Manual rollback uses `deploy/host-deploy.sh sha256:<previous-attested-digest>` and
the same central lock and gates. The engine automatically restores and verifies
the previous running image if startup/acceptance fails. Migrations are deliberately
additive and compatible with the previous runtime; no automatic database downgrade
or destructive data restore runs. First-install failures have no previous image;
keep legacy data/hosting until the new app has passed acceptance. Preserve failed
transaction state and inspect `state/deploy.log` privately before retrying.

App secrets, snapshots, hooks, Compose and state follow the shared encrypted NAS
backup contract. Provisioning registers the database. Verify a successful backup
and an isolated restore during the production cutover; do not infer that a newly
registered app has already appeared in a completed archive.
