# Recipe Saver on the host

## Shared deployment service

This app is registered as `recipe-saver` in the central deployment registry
`/Users/kyle/platform/deploy-core/apps.json`. LaunchAgent
`com.kylescudder.deploy-core` runs the single installed engine. Application hooks
are `deploy/hooks.py`; the receiver, credentials, queues, state and database
contracts below remain app-specific. Manual deployment uses
`./deploy/host-deploy.sh sha256:<digest>`.

Engine updates, application registration, failure inspection and service rollback
are documented in [deploy-core](https://github.com/kylescudder/deploy-core).
Do not install an app-specific LaunchAgent, copy the engine into this repository
or start a second scheduler. Apply engine changes once through the central service.

Every push to `main` runs **Release**. CI checks types and formatting, tests
isolated Postgres owner/runtime permissions, authenticated RPC CRUD and HTTP
routing, tests the queue receiver, and builds the production image. GitHub then
builds native AMD64/ARM64 images, publishes an immutable GHCR manifest and
attests its provenance. The workflow succeeds only when the public API reports
that commit in `X-Recipe-Saver-Revision` and the host acknowledges the same
commit and image digest after completed acceptance checks.

## Services and trust boundaries

- Public app: https://recipes.kylescudder.co.uk, upstream `recipe-saver:3000`.
- Deploy hook: https://deploy-recipe-saver.kylescudder.co.uk/hooks/recipe-saver.
- Checkout: `/Users/kyle/platform/apps/recipe-saver`.
- LaunchAgent: `com.kylescudder.deploy-core`, running as Colima's owner.
- Deployer: the centrally installed service; application behavior lives in `hooks.py`.
- Image: `ghcr.io/kylescudder/recipe-saver@sha256:<digest>`.

One unprivileged Bun container serves the Vite build and `/api/trpc/*`. It joins
external `platform-web` and internal `platform-db` and publishes no host port.
Compose limits it to 256 MiB, one CPU, 128 processes and bounded logs, drops all
capabilities and uses a read-only root filesystem. The API uses four pooled
Postgres connections.

All recipe RPCs require a verified session: Clerk by default, or Better Auth
when `AUTH_PROVIDER=better-auth` (see below). The app uses the
production instance of the Recipe Saver Clerk application, served from
`clerk.recipes.kylescudder.co.uk`. Do not substitute another app's Clerk instance.

The receiver joins only `platform-web`, has no Docker socket, host shell
credentials or database access, and can write only its queue. It reads only the
completed release acknowledgement from a separate read-only mount. It checks exact
paths, HMAC-SHA256 signatures, a five-minute timestamp window, request size and
queue bounds. Cloudflare Access protects the whole deploy hostname with one
Service Auth policy allowing only `github-recipe-saver-deploy`; other
authenticated paths return 404.

The host independently verifies provenance for `kylescudder/recipe-saver`,
`.github/workflows/release.yml`, `refs/heads/main` and GitHub-hosted runners
before pulling the exact digest. Deployments are serialized; queued requests
coalesce to the newest request.

## Database and recovery

The database is `recipe_saver`, registered for weekly encrypted NAS backups.
Initial provisioning used
`python3 /Users/kyle/platform/scripts/provision-project.py recipe_saver`.
Protected credentials stay in `/Users/kyle/platform/projects/recipe_saver/`.
Migrations use `recipe_saver_owner` in a one-shot container; the application
uses `recipe_saver_runtime`. Database credentials never enter GitHub, the image,
receiver or webhook.

After verifying an image, the host saves a private pre-deploy `pg_dump`, runs
owner migrations and waits for application health. `deploy/verify.ts` then checks
HTML, built assets, the revision header, restricted database permissions and
unauthenticated API rejection. Only completed checks publish
`state/public/deployment.json`; CI requires both that exact acknowledgement and
the public API revision.

A failed migration leaves the current app running. Failed application acceptance
restores the previous image. Migrations are not reversed, so schema changes must
remain compatible with the previous runtime. Preserve failed transaction state and
inspect `state/deploy.log` privately before retrying. The database started empty;
rollback uses retained host image digests and Postgres backups only.

## Configuration and commands

GitHub's `production` environment permits `main` only. Its secrets are
`DEPLOY_WEBHOOK_SECRET`, `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`; no
database or Clerk secret goes to GitHub. Repository variables are
`DEPLOY_ENABLED=true` and `RECIPE_SAVER_BASE_URL=https://recipes.kylescudder.co.uk`.
The Clerk publishable key is read at runtime from the host's `.env`, so the image
has no build-time configuration.

The host's `.env`, `.env.deploy-hook`, `secrets/deploy-webhook-secret` and
`secrets/cloudflare-access.json` are protected files ignored by Git and Docker.
The dedicated Access service token lasts one year; renew it before expiry and
update both GitHub Access secrets together. Never print secrets or resolved
Compose output.

From the checkout:

```sh
docker compose -f deploy/compose.deploy-hook.yaml --env-file .env.deploy-hook up -d --wait
launchctl print gui/501/com.kylescudder.deploy-core
tail -n 100 state/deploy.log
docker compose --env-file .env ps
```

Pause automatic deployment:

```sh
gh variable set DEPLOY_ENABLED --body false --repo kylescudder/recipe-saver
```

Redeploy or roll back to a previously attested main digest:

```sh
./deploy/host-deploy.sh sha256:<verified-main-digest>
```

Host `deploy/` tooling and Compose changes require a reviewed checkout update or
receiver recreation. Routine image releases do not execute host scripts
downloaded from the image. No self-hosted GitHub runner is installed. Colima and
Kyle's login session must be running; reboot recovery follows
`/Users/kyle/platform/runbook.md`.

Access must exist before registering the exact hook route. From the platform:

```sh
python3 scripts/hostname.py add recipe-saver-deploy deploy-recipe-saver.kylescudder.co.uk --upstream recipe-saver-deploy-hook:9000 --path /hooks/recipe-saver --dry-run
python3 scripts/hostname.py add recipe-saver recipes.kylescudder.co.uk --upstream recipe-saver:3000 --dry-run
```

App secrets, hooks, Compose and state follow the shared encrypted NAS backup
contract.

## Better Auth rollout and Clerk rollback

`AUTH_PROVIDER` selects exactly one authentication provider for both the server
and the rendered client. It defaults to `clerk`, so the additive release can be
deployed before changing the production sign-in flow. Provider changes require
recreating the app container; do not try to hot-swap its process environment.
With `clerk`, `/api/auth/*` returns 404 and Clerk behaves exactly as before.

The `0001_better_auth` owner migration adds `auth_user`, `auth_session`,
`auth_account`, `auth_verification`, `auth_passkey`, `auth_rate_limit` and
`auth_email_limit`. It does not touch `recipes`. Recipes are a shared household
collection with no per-user ownership, so there are no Clerk user IDs to link and
no user-linking script: access is decided by the allowlist alone. The runtime
keeps its existing four-connection pool and restricted role; tRPC and Better Auth
share that pool.

Prepare these settings in the host's protected `.env`, retaining the Clerk keys:

```dotenv
AUTH_PROVIDER=clerk
BETTER_AUTH_URL=https://recipes.kylescudder.co.uk
BETTER_AUTH_SECRET=<stable, cryptographically random app-specific secret>
BREVO_API_KEY=<Recipe Saver transactional API key>
AUTH_EMAIL_FROM=<verified Brevo sender, e.g. recipes@kylescudder.co.uk>
AUTH_EMAIL_DAILY_LIMIT=40
AUTH_ALLOWED_EMAILS=<comma-separated household emails>
```

`BETTER_AUTH_URL` must equal `APP_ORIGIN` and use HTTPS in production. Generate a
secret of at least 32 characters and keep it stable across releases. Keep it and
the sending API key out of Git, image layers and CI. These settings are validated
only when Better Auth is selected, and errors name fields without printing values.

`AUTH_ALLOWED_EMAILS` is the server-side access list. Accounts are created only
for listed emails, by an email code or magic link that proves ownership; Clerk
user IDs are never trusted or imported. Every recipe RPC also requires a verified
email that is still listed, so removing an address revokes access on the next
request. The passkey RP ID is the exact hostname in `BETTER_AUTH_URL`.

Cutover:

1. Deploy the image through the central service with `AUTH_PROVIDER=clerk`.
   Owner migrations add the auth tables; acceptance checks are unchanged.
2. Add the settings above to the host `.env`.
3. Set `AUTH_PROVIDER=better-auth` and recreate only the `recipe-saver` service
   with the same image. Verify sign-in with an email code, the recipe list,
   signed-out API rejection, Profile, setting a password and passkey enrollment.

Sign-in lives at `/auth/<view>` and offers four methods, each linking to the
others: password (`/auth/sign-in`), email code (`/auth/email-otp`), magic link
(`/auth/magic-link`) and passkey. Forgot/reset password use
`/auth/forgot-password` and `/auth/reset-password`. The old `/sign-in` and
`/sign-up` paths, and `/auth/sign-up`, redirect to `/auth/sign-in`. Every method
returns to the recipe list, or to a same-site `?redirectTo=` path such as
`/profile`. Off-site `redirectTo`, `callbackURL` and reset `redirectTo` values are
refused, including `//host`, `/.//host`, backslashes and control characters.

There is no sign-up. A password is added from Profile ("Set password" sends a
reset link) and changed there. Passwords are 12–128 characters, and a reset
revokes existing sessions. Email codes are six digits, valid once for ten minutes
with five attempts, and stored as a keyed hash. Magic links (10 minutes, stored
hashed) and reset links (30 minutes) are single-use. Emails go only to allowlisted
addresses; everyone else gets the same generic response. Persistent limits include
a 60-second per-recipient cooldown, five sends per recipient per hour, an app-wide
delivery-attempt budget (`AUTH_EMAIL_DAILY_LIMIT`, default 40 per rolling 24
hours) and per-IP auth rate limits stored in Postgres. `/api/auth/*` forwards only
the endpoints the app uses and returns 404 for everything else, including
`/sign-up/email`. On phones, email codes are the most reliable method; the
code form survives a reload by keeping only the pending email and request time in
tab-scoped storage.

Signed-in users get an avatar menu (Better Auth UI `UserButton`) with Profile and
Sign out; sign-out returns to the homepage. `/profile` has a display name,
optional first/last names, the read-only verified email, a profile photo,
password and passkeys.

The profile photo is shown in the header `UserButton` and managed from Profile.
The browser crops it to a 512-pixel JPEG; `/api/profile/avatar` (GET, PUT,
DELETE) then accepts JPEG, PNG or WebP up to 2 MB and 4 megapixels, checks the
file signature, decodes and re-encodes it with `sharp` to a 256-pixel JPEG
without metadata, and stores it as `bytea` in the `user_profile` table added by
migration `0002_profile`. The photo is therefore covered by the existing
encrypted database backups; no volume, service, credential or DNS change is
needed. Each user can read and change only their own photo, with the same rule as
the rest of the app (verified email still in `AUTH_ALLOWED_EMAILS`). Responses
are `no-store`, `nosniff` and same-origin only, writes need this site's
`Origin`, and every change gets a new version in the image URL.
`/update-user` accepts only that server-owned URL (or `null` after removal),
never an arbitrary image URL. Under Clerk the endpoint returns 404. The server
accepts request bodies up to 2 MB plus headroom for this endpoint only; every
other path keeps the 64 KiB limit. On rollback leave `user_profile` in place.

To roll back, set `AUTH_PROVIDER=clerk` and recreate only the app service with the
same image. Keep the Clerk keys, its production instance and DNS available. Leave
the additive auth tables in place; never restore an older database just to change
providers, because that would discard newer recipes.

Brevo's free plan adds a `List-Unsubscribe` header even to transactional emails,
which some clients show as a mailing-list banner; it cannot be removed without
Brevo approval.

## Database connection budget

The runtime role is limited to eight PostgreSQL connections. Application work
uses at most four, health checks at most one, and deployment verification or
database CLI work at most one. Sequential deployment commands use their own
one-connection client instead of importing the application pool. This leaves
two slots for operator connections during a release; owner migrations use a
separate role and explicitly limit their client to one connection. The shared
application client and owner migration client use a 20-second idle timeout and a
10-second connect timeout. Health retains its separate three-second deadline.

CI exercises the real application, deployment and health clients against an
eight-connection test role, with all four application slots held open. Concurrent
deployment queries must share one backend, overlapping health probes must share
one separate connection, two spare slots must remain usable, and a ninth
connection must be rejected by PostgreSQL. Integration tests also check idle
connection retirement and reconnection, serialized owner queries, repeatable
migrations and the migration command's clean exit.
