# Human developer and operations guide

## System map

### Public surface
- `/`: cinematic event site, static/source-controlled decorative content plus database event configuration and managed gallery/sponsor/winner/coordinator content.
- `/register`: public registration and payment submission.
- `/pass/[qrToken]`: public participant pass.
- Public APIs serve event configuration/state, visible content, registration creation, team-name availability, pass lookup, and public uploaded assets.

### Authentication and roles
- NextAuth credentials login checks bcrypt hashes and a selected login role against the database role. Sessions are signed JWTs with a seven-day lifetime; the JWT carries user ID and role.
- Roles are SUPER_ADMIN, COORDINATOR, FOOD_ADMIN, PARTICIPANT.
- Mutating and sensitive APIs call `requirePermission`; the permission matrix lives in `src/lib/permissions.ts`.
- Keep `NEXTAUTH_SECRET` private and set `NEXTAUTH_URL` to the canonical HTTPS origin. The reverse proxy should pass the expected host and protocol; the application does not enable arbitrary host trust.

### Database
PostgreSQL is the only supported database. Prisma schema is `prisma/schema.prisma`; immutable committed migrations are under `prisma/migrations`. Core tables cover users, event configuration, phases, teams, participants, payments/screenshots, meals/check-ins, public managed content, audit logs, and change history. The team name and participant QR/participant identifiers have unique constraints. Food check-ins have a unique (participant, meal) constraint.

`EventConfig` uses the fixed ID `singleton`; bootstrap creates it only when absent and preserves existing operator-managed values. Registration capacity is enforced under a transaction-scoped PostgreSQL advisory lock. Food duplicate prevention is enforced by the database constraint.

### Registration and payment
Server-side Zod validation requires 3–4 members, college and degree, valid member data, and unique email addresses within a team. The server assigns the first member as leader and ignores client leader flags. Team names are normalized and checked transactionally. Payment is a separate state transition; approval creates registration/participant identifiers and opaque QR tokens. Acknowledgement/approval email failures do not roll back the database mutation.

### Storage
New public files are written to `HM3_PUBLIC_UPLOAD_DIR`; new payment screenshots go to `HM3_PRIVATE_UPLOAD_DIR`. If unset, both directories are under `storage/` relative to the runtime working directory. The public upload route only accepts generated, constrained filenames. Private screenshots are outside the public route and are streamed from the authorized admin payment endpoint with no-store headers.

Mount both paths on persistent storage outside a release directory. Back them up with PostgreSQL. Restrict private directory access to the service account and backup operators. Before upgrading, copy legacy `public/uploads` contents into the new public upload directory and `.private-uploads` contents into the private upload directory. The old `.private-uploads/` local path is also read as a compatibility fallback. Existing Supabase-backed screenshot rows can still be read if legacy Supabase credentials are configured; new uploads never use that provider. Migrate legacy files before removing that compatibility. Standalone packaging deliberately excludes `public/uploads` so runtime uploads cannot leak into a release artifact.

Upload validation allows JPEG, PNG, WebP, and GIF up to 8 MiB, requires recognized magic bytes matching the declared MIME, and uses server-generated filenames.

### Email
Production email uses Resend via `RESEND_API_KEY` and `EMAIL_FROM`. Keep credentials server-side. Templates escape interpolated HTML and include text alternatives. Missing provider configuration/failure does not undo committed registration or approval. A failed registration acknowledgement releases its idempotency claim; a later payment submission retries it. Successful delivery is recorded separately. A stale in-progress claim can be retried after its lease expires.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Runtime and Prisma commands | PostgreSQL connection used by Prisma |
| `DIRECT_URL` | Prisma schema | Direct PostgreSQL URL for migration operations |
| `NEXTAUTH_URL` | Runtime | Canonical HTTPS application origin and absolute approval-pass links |
| `NEXTAUTH_SECRET` | Runtime | JWT/session signing secret |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Bootstrap only | Initial super-admin credentials |
| `HM3_BERSERK_SECRET` | Bootstrap only | Recovery secret hash for credential rotation |
| `COORDINATOR_USERNAME/EMAIL/PASSWORD` | Optional bootstrap group | Create/update coordinator operational user; set all three |
| `FOOD_ADMIN_USERNAME/EMAIL/PASSWORD` | Optional bootstrap group | Create/update food administrator; set all three |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional; configure in production | Resend API access and verified sender |
| `HM3_PUBLIC_UPLOAD_DIR` | Optional | Persistent public upload directory |
| `HM3_PRIVATE_UPLOAD_DIR` | Optional | Persistent private payment screenshot directory |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Legacy only | Read existing screenshots stored in Supabase; new files do not use it |
| `PORT`, `HOSTNAME` | Optional | Standalone listener; production should bind loopback behind proxy |

Generate secrets with an approved secret manager or cryptographically secure generator. Never commit populated environment files.

## Build and deployment

Primary deployment is a standalone Node.js server supervised by systemd, with PostgreSQL and nginx/Caddy external to the application.

Build on Linux using the locked Bun dependency graph:

```sh
bun install --frozen-lockfile
bun run db:validate
bun run build
```

The build runs Prisma client generation, Next.js compilation, and standalone artifact preparation. It does not migrate or bootstrap the database. Artifact location: `.next/standalone/`; `scripts/prepare-standalone.mjs` copies `.next/static` and public static assets into it.

Copy the standalone directory to a versioned release directory. Do not copy `.env`, credentials, development databases, or runtime storage. On the server set:

- `DATABASE_URL` and `DIRECT_URL`
- `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
- `HM3_PUBLIC_UPLOAD_DIR=/var/lib/hackmitten/public`
- `HM3_PRIVATE_UPLOAD_DIR=/var/lib/hackmitten/private`
- Resend settings when production email is enabled

Give the service account read/execute access to the release and write access only to the two storage directories.

Before first startup or each release that contains migrations:

```sh
bun run db:migrate:deploy
```

For initial provisioning only:

```sh
bun run db:bootstrap
```

Bootstrap requires the ADMIN credential trio and HM3_BERSERK_SECRET. It creates the singleton configuration, default meals, and configured operational users. It does not load demo records. Re-running it intentionally reconciles configured operational credentials; protect its environment and run only as an operator.

Runtime from the versioned artifact directory:

```sh
PORT=3000 HOSTNAME=127.0.0.1 node server.js
```

Use `deploy/hackmitten.service` as a starting systemd unit. Place a TLS reverse proxy in front, forward the canonical host/protocol, enforce a 9 MiB request body limit for upload routes and rate limits for `/api/auth/callback/credentials` and `/api/registrations`, and proxy to `127.0.0.1:3000`. The app adds nosniff, frame, referrer, and permissions headers. Health/readiness is `GET /api/health`: 200 means the app and database are available; 503 means database readiness failed. Response details are intentionally generic.

## Operations

### Logs and restart
Use `journalctl -u hackmitten` and `systemctl restart hackmitten`. Application logs go to stdout/stderr for systemd capture. Do not log credentials, tokens, payment image paths, or provider secrets.

### Persistent data and backup
Back up PostgreSQL and both configured storage directories. Keep private screenshot backups access-controlled and encrypted at rest. Coordinate database and filesystem snapshots so database screenshot rows do not outlive required files. Test restore procedures in a non-production environment.

### Upgrade
1. Build and inspect a versioned artifact on Linux.
2. Back up PostgreSQL and storage.
3. Deploy the artifact to a new release directory.
4. Run `bun run db:migrate:deploy` once with production database configuration.
5. Switch the service symlink/current release and restart.
6. Verify `/api/health`, login, registration, and private screenshot access.

### Rollback
Switch the service back to the previous application release and restart. Database migrations are forward-only unless a migration explicitly provides a safe reverse. Do not assume rolling back application files reverses schema/data changes. If the previous application cannot work with the migrated schema, restore a coordinated pre-upgrade database and storage backup under an approved recovery plan.

### Development and tests
`bun run db:migrate` creates/applies development migrations. Never use reset or schema-push commands against production. `bun test` runs unit tests; `tests/food-checkin.test.ts` requires a dedicated disposable PostgreSQL database and otherwise skips. Run `bun run lint`, `bun run typecheck`, `bun run db:validate`, `bun test`, and `bun run build` before release.

## Event rules and content

Canonical event values are stored in bootstrap defaults and editable event configuration: Hackmitten 3.0, 29 October 2026 at 11:00 Asia/Kolkata, 24 hours, registration deadline 22 October 2026 at 11:00 IST, fee ₹1,000, prize pool ₹1,00,000, team size 3–4, venue Maharaja Institute of Technology Thandavapura. Bootstrap preserves an existing event configuration. Do not re-run bootstrap to overwrite operator-managed event values.

Source-controlled gallery, sponsor, coordinator, developing-team, and winner content remains under `src/data` where currently used; database-managed content is managed through admin APIs. Do not replace real event content with sample data.

## Security and privacy

- Never collect participant passport/student photographs.
- QR tokens are random opaque 192-bit values; the public pass includes pass details needed by the participant and omits college/contact information.
- Payment screenshots are never served through public upload URLs.
- Every sensitive API must keep server-side permission checks.
- Keep credentials in the secret manager and rotate compromised values.
- Use a TLS reverse proxy and restrict direct network access to the Node listener.
