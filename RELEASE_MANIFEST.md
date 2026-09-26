# Release manifest

## Runtime architecture

- Next.js 16 App Router, React 19, TypeScript, NextAuth credentials auth.
- PostgreSQL with Prisma 6 and committed forward migrations.
- Standalone Node.js artifact at `.next/standalone/`, supervised by systemd behind a TLS reverse proxy.
- Persistent filesystem for new uploads: configured public and private directories. Public uploads stream through `/api/uploads/[fileName]`; payment screenshots stream only through the permission-protected admin endpoint.
- Nodemailer SMTP transport with STARTTLS/TLS for registration email.
- No hosted storage client is included. All managed files use the configured Linux filesystem; participant images and payment screenshots are private.

## Build and database lifecycle

- `bun run db:generate`: Prisma client generation.
- `bun run build`: Next.js production build and standalone runtime preparation only. No database migration or bootstrap.
- `bun run db:migrate:deploy`: explicit production migration step.
- `bun run db:bootstrap`: explicit provisioning of initial/configured operational users, singleton event config, and default meals.
- `bun run start`: starts standalone `server.js`; set `PORT` and `HOSTNAME`.
- No production database reset or `db push` is part of deployment.

## Artifact

Build with `bun install --frozen-lockfile && bun run build` on Linux. Package `.next/standalone/`, which contains `server.js`, traced runtime dependencies, `.next/static`, and public static assets. Do not include environment files, database credentials, storage contents, or development databases. Runtime persistent storage must be mounted externally.

## Required runtime configuration

`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `HACKMITTEN_STORAGE_ROOT`. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Bootstrap-only variables: admin/coordinator/food-admin username, email, and password groups, plus `HM3_BERSERK_SECRET`. See `.env.example`.

## Operations

- Readiness: `GET /api/health`, HTTP 200 when PostgreSQL is available, 503 when unavailable.
- Primary deployment: standalone Node.js process under systemd, loopback port 3000, nginx/Caddy TLS reverse proxy.
- Persistent paths: operator-configured `HM3_PUBLIC_UPLOAD_DIR` and `HM3_PRIVATE_UPLOAD_DIR`, for example `/var/lib/hackmitten/public` and `/var/lib/hackmitten/private`.
- Back up PostgreSQL and both filesystem paths. Restrict private screenshot access and backups.
- Rollback application release by switching back to the prior artifact. Database migration rollback requires an explicit safe reverse migration or coordinated backup restore.

## Repository areas

- `src/app`: pages and API handlers.
- `src/lib`: authentication, authorization, business rules, Prisma, storage, email, audit, and change history.
- `prisma/schema.prisma`, `prisma/migrations`: PostgreSQL model and migration history.
- `tests`: Bun unit tests and optional PostgreSQL integration tests.
- `deploy/hackmitten.service`: systemd unit template.

Optional private participant photos are supported at a strict 512,000-byte maximum. Demo seeding has been removed from the release scripts.
