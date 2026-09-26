# Hackmitten 3.0 datacenter deployment handoff

This release separates the existing Next.js UI and API into two source packages. The backend remains the sole owner of PostgreSQL, private files, SMTP, credentials, sessions, and operational authorization. The frontend uses same-origin `/api/*` URLs. Nginx exposes HTTPS and sends `/api/` to the backend; backend port 3001 must remain private.

## Package contents and build model

`artifacts/hackmitten-frontend.tar.gz` contains the frontend source, public website images, its minimal dependency manifest, and `.env.example`. It contains no API routes, Prisma files/client, SMTP/storage/auth server modules, credentials, `.env`, or participant images.

`artifacts/hackmitten-backend.tar.gz` contains API routes, server libraries, Prisma schema/migrations/seed, tests, and its backend-only dependency manifest. It contains no website pages, public frontend image tree, `.env`, private participant uploads, or production secrets.

Dependencies are installed from each package's `bun.lock` on the Linux deployment/build host. Artifacts are source packages, not precompiled Linux binaries. The archive builder deliberately does not package `node_modules`, `.next`, local uploads, or Git history. Build both packages on Linux, then deploy the generated `.next/standalone` directories. No database migration or user bootstrap is run by application compilation.

## Required infrastructure values

The datacenter administrator supplies the real frontend DNS name/IP, PostgreSQL endpoint, SMTP endpoint/account, certificate, firewall policy, and secret values. Nothing in this repository guesses those values. Copy `environment/backend.env.example` to `/etc/hackmitten/backend.env`; restrict it to `root:hackmitten` mode `0640` (or stricter). Frontend production has no secret environment file. For local split development, copy `environment/frontend.env.example` to the frontend package `.env.local`; it only contains the backend API origin.

Backend variables:

- `DATABASE_URL`, `DIRECT_URL`: PostgreSQL runtime and migration URLs.
- `NEXTAUTH_URL`: canonical public HTTPS origin. `NEXTAUTH_SECRET`: stable random secret (e.g. `openssl rand -base64 48`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
- `HACKMITTEN_STORAGE_ROOT`: persistent private file root; production example `/var/lib/hackmitten`.
- `BACKEND_CORS_ORIGINS`: comma-separated exact origins, never `*`. Same-origin production proxy requests do not need CORS. Keep only deliberate development origins here.
- `HM3_BERSERK_SECRET` and the three bootstrap username/email/password groups: needed only for explicit operational bootstrap/reset. Supply real values through protected environment storage, not source control.
- `HOSTNAME=127.0.0.1`, `PORT=3001`, `NODE_ENV=production` bind the API service to loopback.

Frontend local-development variable: `BACKEND_API_ORIGIN=http://127.0.0.1:3001` enables a same-origin Next.js development proxy. Production Nginx owns this routing; no backend URL or IP is compiled into the client bundle. The UI calls relative `/api/*` paths.

## Build-time, runtime, and database operations

Use Node.js 22 LTS and Bun 1.4.2 on the Linux builder/deployment host. Package dependency versions are pinned from the repository's frozen root lockfile, then each component receives its own frozen `bun.lock`. After extracting each archive into separate package directories:

```sh
cd frontend
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun test
BACKEND_API_ORIGIN=http://127.0.0.1:3001 bun run build  # optional for development proxy; production may omit
```

```sh
cd backend
bun install --frozen-lockfile
bun run db:validate
bun run lint
bun run typecheck
bun test
bun run db:generate
bun run build
```

Database is operated separately from build:

```sh
cd backend
DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" bun run db:migrate:deploy
```

Run bootstrap only after reviewing the target database and setting all required bootstrap values in the protected backend environment:

```sh
cd backend
bun run db:bootstrap
```

Bootstrap creates/reconciles the operational accounts; it is not part of `build` or service startup. Do not rerun casually on a live system.

## Local split run

Extract/build both packages and install each package's dependencies. Start the backend in terminal one (`cd backend && bun run dev`, port 3001). Copy the frontend env example to `.env.local`, then start terminal two (`cd frontend && bun run dev`, port 3000). The frontend proxy forwards `/api/*` to the backend and keeps browser requests/cookies same-origin. Configure a development PostgreSQL database and backend SMTP test account as required. Check `http://localhost:3000`, `http://localhost:3000/api/health`, and sign in through the frontend.

For compiled local run, build both; start the backend with `HOSTNAME=127.0.0.1 PORT=3001 bun run start`, then the frontend on port 3000. On Linux use separate service processes and Nginx below.

## Linux host preparation

1. Create non-root service accounts `hackmitten` (backend) and `hackmitten-web` (frontend). Install Node.js 22 LTS, Bun 1.4.2, PostgreSQL client tools, Nginx, and TLS tooling.
2. Allow inbound 80/443 only. Keep 3000, 3001, and PostgreSQL private; bind Node services to `127.0.0.1`. If PostgreSQL is remote, firewall 5432 to the backend host only and require database TLS.
3. Install immutable release directories under `/opt/hackmitten/frontend/releases/<release>` and `/opt/hackmitten/backend/releases/<release>`. Set `current` symlinks only after successful builds/verification.
4. Create storage with restrictive ownership and mode:

```sh
sudo install -d -o hackmitten -g hackmitten -m 0700 /var/lib/hackmitten
sudo install -d -o hackmitten -g hackmitten -m 0700 /var/lib/hackmitten/private
sudo install -d -o hackmitten -g hackmitten -m 0750 /etc/hackmitten
sudo install -o root -g hackmitten -m 0640 backend.env /etc/hackmitten/backend.env
```

The backend creates private files with mode 0600 under a mode 0700 private directory. Never configure Nginx `root` or `alias` to `/var/lib/hackmitten`. Back up PostgreSQL and `/var/lib/hackmitten` together, encrypt backups, restrict access, and periodically test restore to a separate host/database. Example:

```sh
pg_dump --format=custom --file="$BACKUP_DIR/hackmitten-$(date +%F).dump" --dbname="$DATABASE_URL"
sudo tar -czf "$BACKUP_DIR/hackmitten-storage-$(date +%F).tar.gz" -C /var/lib hackmitten
pg_restore --no-owner --dbname="$RECOVERY_DATABASE_URL" "$BACKUP_DIR/hackmitten-YYYY-MM-DD.dump"
```

5. Install TLS certificates for the frontend public DNS name. Edit `deploy/nginx-hackmitten.conf`: replace `frontend.example.invalid` and certificate paths with datacenter-supplied values. Install `deploy/nginx-limits.conf` under `/etc/nginx/conf.d/` (inside `http {}`) and `deploy/nginx-proxy-headers.conf` as `/etc/nginx/snippets/nginx-proxy-headers.conf`. Enable the site, run `sudo nginx -t`, then reload Nginx. Do not expose backend port 3001.
6. Install `deploy/hackmitten-backend.service` and `deploy/hackmitten-frontend.service` into `/etc/systemd/system/`. Confirm paths/users; run `sudo systemctl daemon-reload`, enable and start backend, then frontend. Use `journalctl -u hackmitten-backend -u hackmitten-frontend` for operational logs. Secrets are read only from the backend EnvironmentFile.
7. Deploy in this order: transfer backend; install dependencies; configure PostgreSQL and environment; validate/generate Prisma; deploy migrations explicitly; bootstrap users explicitly when needed; build/start backend; transfer frontend; install/build/start frontend; configure Nginx and HTTPS; verify health, login, registration, private images, exports, QR pass, and food check-in.

Example account and source release preparation (replace `<release>` with an operator-chosen release identifier):

```sh
sudo useradd --system --user-group --home-dir /opt/hackmitten/backend --shell /sbin/nologin hackmitten
sudo useradd --system --user-group --home-dir /opt/hackmitten/frontend --shell /sbin/nologin hackmitten-web
sudo install -d -o hackmitten -g hackmitten -m 0750 /opt/hackmitten/backend/releases/<release>
sudo install -d -o hackmitten-web -g hackmitten-web -m 0750 /opt/hackmitten/frontend/releases/<release>
sudo tar -xzf hackmitten-backend.tar.gz -C /opt/hackmitten/backend/releases/<release>
sudo tar -xzf hackmitten-frontend.tar.gz -C /opt/hackmitten/frontend/releases/<release>
```

Run installs and builds as each service account. Run backend migration/bootstrap commands from its source release with protected environment values loaded only for the command. Copy each `.next/standalone/` directory contents into its service release root before pointing the service `current` symlink there; standalone preparation already includes `.next/static` and frontend public assets. Do not copy `.env` into either release.

```sh
sudo -u hackmitten sh -c 'cd /opt/hackmitten/backend/releases/<release> && bun install --frozen-lockfile && bun run db:validate && bun run db:generate && bun run lint && bun run typecheck && bun test && bun run build'
sudo -u hackmitten-web sh -c 'cd /opt/hackmitten/frontend/releases/<release> && bun install --frozen-lockfile && bun run lint && bun run typecheck && bun test && bun run build'
```

## Nginx and origin behavior

The sample exposes one HTTPS origin. Nginx proxies `/api/` (including `/api/auth`, `/api/health`, CSV, and private image paths) to `127.0.0.1:3001`; all other requests go to `127.0.0.1:3000`. This is the supported browser authentication topology: the backend issues the NextAuth cookie through the public frontend origin, so the browser uses normal same-origin cookie behavior. `src/proxy.ts` rejects unconfigured cross-origin API requests and handles exact-origin credentialed CORS preflight. No wildcard origin is used. Configure any required development origin explicitly in `BACKEND_CORS_ORIGINS`; never add an origin solely to bypass session cookie constraints.

The Nginx global body cap is 9 MiB to support the existing payment screenshot route. The registration endpoint has a 2.1 MiB cap for a multipart request containing bounded participant image(s), while each participant image is independently capped at exactly 512,000 bytes in the backend. The private filesystem is not served directly.

## Health, upgrades, and rollback

`GET https://<public-frontend-domain>/api/health` checks backend process routing and PostgreSQL readiness; success is HTTP 200 with `{"status":"ok","database":"available"}`. A 503 means backend/database readiness failed. Review service logs and PostgreSQL connectivity without logging secrets.

Before upgrades, take database and storage backups. Build and verify new release directories; deploy additive/forward migrations before switching backend/frontend symlinks. Start and smoke-test new services, then switch symlinks and restart. Keep the previous release directories. Roll back code by restoring previous symlinks; database rollback requires a reviewed forward-fix or restoring a consistent database/storage backup. Do not manually drop columns/tables to roll back.

Troubleshooting: login issues usually mean mismatched public `NEXTAUTH_URL`, secret rotation, or missing forwarded HTTPS headers; SMTP failures require checking outbound firewall/DNS and server-side SMTP logs; image 413 responses require checking both Nginx and backend limits; 404 private images require checking database storage keys and persistent storage mount/permissions; health 503 requires checking PostgreSQL URL/ACL/service.

## Artifact verification and local limits

Verify transferred bytes with:

```sh
sha256sum -c SHA256SUMS
tar -tzf hackmitten-frontend.tar.gz | less
tar -tzf hackmitten-backend.tar.gz | less
```

The packager scans selected source trees rather than copying the repository. It excludes `.env`, Git, dependency/build output, `public/uploads`, and local/private uploads. Review generated manifests and scans before transfer. Do not include protected runtime env files in release archives.

This repository authoring host is Windows and has no functioning WSL distribution or Docker runtime. The checked-in package generator creates portable source tarballs and checksums; Linux-native standalone builds, Fedora SELinux policy, service startup, Nginx syntax, actual PostgreSQL migrations/races, SMTP delivery, HTTPS, and firewall behavior must be verified on the datacenter Linux host. No claim of datacenter validation is made here.
