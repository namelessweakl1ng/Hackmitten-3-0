# Hackmitten 3.0

Hackmitten 3.0 is a Next.js 16 application for public event information, team registration and payment review, participant passes, food check-in, and role-based administration.

## Architecture

- The repository source is staged into independently deployable Next.js frontend and API-only backend packages by `bun run package:deployments`.
- Frontend owns public, registration, login, admin/coordinator/food pages and public assets. It contains no API route code, Prisma schema, SMTP module, or private storage code.
- Backend owns all `/api/*` routes, NextAuth credential validation/session cookies, server authorization, PostgreSQL/Prisma, SMTP, and private files.
- Production Nginx serves one HTTPS origin and routes `/api/` to the private backend listener. Browser calls and session cookies therefore stay same-origin; backend ports are not public.
- PostgreSQL migrations and operational-user bootstrap are explicit operations, never part of application build/start.
- Participant photos remain private and limited to 512,000 bytes. Managed files use the Linux filesystem rooted at `HACKMITTEN_STORAGE_ROOT` (normally `/var/lib/hackmitten`).
- Email uses authenticated SMTP with STARTTLS/TLS. Delivery failures do not roll back committed registration or status changes.

## Requirements

- Bun 1.4.2 for reproducible split-package install, tests, and Prisma operations.
- Node.js 20.9 or later for the standalone runtime.
- PostgreSQL 14 or later.
- Linux host, TLS reverse proxy, and persistent writable storage.

## Environment

For split deployments, keep frontend and backend configuration separate. The backend-only template is `deployment/environment/backend.env.example`; the frontend template has only a non-secret development API origin. Never bake runtime values into an artifact.

Backend runtime requires `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, persistent storage, and SMTP values.

Bootstrap-only values include the admin, coordinator, and food-admin username/email/password groups plus `HM3_BERSERK_SECRET`. Set them only for the explicit bootstrap operation, then remove them from the service environment.

Configure SMTP with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. See [deployment/README.md](deployment/README.md) for package-specific environments, Linux services, Nginx, migrations, backup, and recovery.

## Development

To run the deployable architecture locally, first create the packages and follow [deployment/README.md](deployment/README.md): start the backend on 3001, then the frontend on 3000 with `BACKEND_API_ORIGIN=http://127.0.0.1:3001`. The older combined root development app remains available for repository-level work:

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
