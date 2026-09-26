# Hackmitten 3.0

Hackmitten 3.0 is a Next.js 16 application for public event information, team registration and payment review, participant passes, food check-in, and role-based administration.

## Architecture

- Next.js App Router, React 19, TypeScript, standalone Node.js output.
- PostgreSQL managed through Prisma. Migrations are explicit deployment operations.
- Credentials authentication with NextAuth.js JWT sessions and bcrypt password hashes.
- Roles: SUPER_ADMIN, COORDINATOR, FOOD_ADMIN, PARTICIPANT. API handlers enforce permissions on the server.
- Public uploads are stored under `HM3_PUBLIC_UPLOAD_DIR` and served through `/api/uploads/<generated-name>`.
- Payment screenshots and optional participant photos are stored under the private directory; only authorized endpoints stream them. Participant photos are limited to 1 MiB.
- Managed uploads use the Linux filesystem rooted at `HACKMITTEN_STORAGE_ROOT` (production default `/var/lib/hackmitten`); public content is served through validated application paths.
- Email uses Resend when configured. Production email delivery failures do not roll back registration or approval state.

## Requirements

- Bun 1.3 or later for install, scripts, tests, and Prisma operations.
- Node.js 20.9 or later for the standalone runtime.
- PostgreSQL 14 or later.
- Linux host, TLS reverse proxy, and persistent writable storage.

## Environment

Copy `.env.example` and provide production values through a protected environment file or secret manager. Never bake them into the application artifact.

Required at runtime: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

Required only for first bootstrap: `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `HM3_BERSERK_SECRET`.

Required for production storage: `HACKMITTEN_STORAGE_ROOT` (normally `/var/lib/hackmitten`). Optional: coordinator/food-admin credential groups, Resend settings, and directory overrides. See [HUMAN_DEVELOPER_GUIDE.md](HUMAN_DEVELOPER_GUIDE.md).

## Development

```sh
bun install
cp .env.example .env
# Configure a development PostgreSQL database and local secrets.
bun run db:generate
bun run db:migrate
bun run db:bootstrap
bun run dev
```

Use `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build` for validation. PostgreSQL integration tests require a dedicated disposable test database.

## Datacenter deployment

Follow the complete Linux installation, offline transfer, database, systemd, Nginx, TLS, backup, upgrade, and recovery instructions in [SETUP.md](SETUP.md). The standalone build is intentionally separate from migration and bootstrap operations. Do not run the demo seed in production.

## Event rules

Teams contain 3–4 people. The first submitted member is assigned as the only leader. College and degree are required. Registration fee is ₹1,000. Payment acknowledgement is sent to the team leader. Optional participant photos are private and limited to 1 MiB each.
