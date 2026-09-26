# Hackmitten 3.0

Hackmitten 3.0 is a Next.js 16 application for public event information, team registration and payment review, participant passes, food check-in, and role-based administration.

## Architecture

- Next.js App Router, React 19, TypeScript, standalone Node.js output.
- PostgreSQL managed through Prisma. Migrations are explicit deployment operations.
- Credentials authentication with NextAuth.js JWT sessions and bcrypt password hashes.
- Roles: SUPER_ADMIN, COORDINATOR, FOOD_ADMIN, PARTICIPANT. API handlers enforce permissions on the server.
- Public uploads are stored under `HM3_PUBLIC_UPLOAD_DIR` and served through `/api/uploads/<generated-name>`.
- Payment screenshots and optional participant photos are stored under the private directory; only authorized endpoints stream them. Participant photos are limited to 512,000 bytes each.
- Managed uploads use the Linux filesystem rooted at `HACKMITTEN_STORAGE_ROOT` (production default `/var/lib/hackmitten`); public content is served through validated application paths.
- Email uses authenticated SMTP with STARTTLS/TLS. Delivery failures do not roll back committed registration or status changes.

## Requirements

- Bun 1.3 or later for install, scripts, tests, and Prisma operations.
- Node.js 20.9 or later for the standalone runtime.
- PostgreSQL 14 or later.
- Linux host, TLS reverse proxy, and persistent writable storage.

## Environment

Copy `.env.example` and provide production values through a protected environment file or secret manager. Never bake them into the application artifact.

Required at runtime: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

Required only for bootstrap: the admin, coordinator, and food-admin username/email/password groups plus `HM3_BERSERK_SECRET`. `.env.example` provides the required usernames; set real account emails and unique passwords in the protected runtime environment.

Required for production storage: `HACKMITTEN_STORAGE_ROOT` (normally `/var/lib/hackmitten`). Configure SMTP with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Directory overrides are optional. See [HUMAN_DEVELOPER_GUIDE.md](HUMAN_DEVELOPER_GUIDE.md).

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

Follow the complete Linux installation, offline transfer, database, systemd, Nginx, TLS, backup, upgrade, and recovery instructions in [SETUP.md](SETUP.md). The standalone build is intentionally separate from migration and bootstrap operations.

## Event rules

Teams contain 3–4 people. The first submitted member is assigned as the only leader. College and degree are required. Registration fee is ₹1,000. Payment acknowledgement is sent to the team leader. Optional participant photos are private and limited to 512,000 bytes each.
