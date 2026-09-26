# Release manifest

## Runtime architecture

- Next.js 16 App Router, React 19, TypeScript, NextAuth credentials auth.
- PostgreSQL with Prisma 6 and committed forward migrations.
- Standalone Node.js artifact at `.next/standalone/`, supervised by systemd behind a TLS reverse proxy.
- Persistent filesystem for new uploads: configured public and private directories. Public uploads stream through `/api/uploads/[fileName]`; payment screenshots stream only through the permission-protected admin endpoint.
- Resend for configured production email.
- Supabase client is retained only to read legacy screenshot objects from existing database rows. New uploads use the filesystem. Vercel Blob is not used.

## Build and database lifecycle

- `bun run build`: Prisma client generation, Next.js production build, standalone runtime preparation. No database migration or bootstrap.
- `bun run db:migrate:deploy`: explicit production migration step.
- `bun run db:bootstrap`: explicit provisioning of initial/configured operational users, singleton event config, and default meals.
- `bun run start`: starts standalone `server.js`; set `PORT` and `HOSTNAME`.
- No production database reset or `db push` is part of deployment.

## Artifact

Build with `bun install --frozen-lockfile && bun run build` on Linux. Package `.next/standalone/`, which contains `server.js`, traced runtime dependencies, `.next/static`, and public static assets. Do not include environment files, database credentials, storage contents, or development databases. Runtime persistent storage must be mounted externally.

## Required runtime configuration

`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `HM3_PUBLIC_UPLOAD_DIR`, and `HM3_PRIVATE_UPLOAD_DIR`. Configure `RESEND_API_KEY` and `EMAIL_FROM` for production email. Bootstrap-only variables: `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `HM3_BERSERK_SECRET`. See `.env.example`.

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

No passport/student image collection is implemented. Demo seeding is development-only and must not be run in production.
