# Hackmitten 3.0

Hackmitten 3.0 is a Next.js 16 application for public event information, team registration and payment review, participant passes, food check-in, and role-based administration.

## Architecture

- Next.js App Router, React 19, TypeScript, standalone Node.js output.
- PostgreSQL managed through Prisma. Migrations are explicit deployment operations.
- Credentials authentication with NextAuth.js JWT sessions and bcrypt password hashes.
- Roles: SUPER_ADMIN, COORDINATOR, FOOD_ADMIN, PARTICIPANT. API handlers enforce permissions on the server.
- Public uploads are stored under `HM3_PUBLIC_UPLOAD_DIR` and served through `/api/uploads/<generated-name>`.
- Payment screenshots are stored under `HM3_PRIVATE_UPLOAD_DIR`; only the authorized payment screenshot endpoint streams them.
- New uploads use the persistent filesystem. Supabase support remains only to read legacy private screenshots already recorded as `supabase://`; Vercel Blob is not used.
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

Optional: coordinator/food-admin credential groups, Resend settings, and persistent storage directory overrides. See [HUMAN_DEVELOPER_GUIDE.md](HUMAN_DEVELOPER_GUIDE.md).

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

Build on a clean Linux build host; the build does not connect to PostgreSQL or bootstrap records:

```sh
bun install --frozen-lockfile
bun run build
```

The runtime artifact is `.next/standalone/`. It includes the standalone server, required runtime dependencies, `.next/static`, and public static assets. Do not package `.env`, local databases, or production secrets.

On the server, configure the environment and persistent directories, then run once per release:

```sh
bun run db:migrate:deploy
```

On initial installation only, run:

```sh
bun run db:bootstrap
```

Start the application from the artifact directory:

```sh
PORT=3000 HOSTNAME=127.0.0.1 node server.js
```

Use the supplied systemd unit template in `deploy/hackmitten.service` as the primary runtime model. Put nginx or Caddy in front for HTTPS and proxy to loopback port 3000. The readiness endpoint is `GET /api/health`; it returns HTTP 200 when PostgreSQL is reachable and 503 otherwise.

See [HUMAN_DEVELOPER_GUIDE.md](HUMAN_DEVELOPER_GUIDE.md) for persistent storage, service setup, backups, upgrades, and rollback. Do not run the demo seed in production.

## Event rules

Teams contain 3–4 people. The first submitted member is assigned as the only leader. College and degree are required. Registration fee is ₹1,000. Payment acknowledgement is sent to the team leader. No participant passport or student image is collected.
