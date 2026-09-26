# Linux deployment setup

The deployable frontend/backend split is documented in the complete datacenter handoff at [deployment/README.md](deployment/README.md). Use that guide and its packages/configuration as the canonical production procedure; this root file exists as the established setup link.

## Build source packages and checksums

From the repository on a host with Node.js, Bun 1.3.4, and `tar`:

```sh
bun install --frozen-lockfile  # Bun 1.4.2; also prepares the locked dependency set for split packaging
bun run package:deployments
deployment/scripts/verify-artifacts.sh
```

The command creates:

- `deployment/artifacts/hackmitten-frontend.tar.gz`
- `deployment/artifacts/hackmitten-backend.tar.gz`
- `deployment/artifacts/SHA256SUMS`
- Linux Nginx and systemd templates under `deployment/nginx/` and `deployment/systemd/`

These are source packages. On the Linux deployment/build host, unpack each package, install from its own `bun.lock`, run its tests and build, then deploy the generated standalone runtime. Frontend and backend builds do not migrate PostgreSQL or bootstrap users.

## Database and secrets

PostgreSQL must be private to the backend network. Runtime, migration, SMTP, NextAuth, storage, CORS, and one-time bootstrap variables are listed in `deployment/environment/backend.env.example`. Frontend server configuration is listed in `deployment/environment/frontend.env.example`; it has no credentials. Keep real values in protected host configuration and remove bootstrap-only passwords and reset secrets from the backend service environment after the approved operation.

For local development, run the packages independently as described in [deployment/README.md](deployment/README.md): backend on loopback port 3001 and frontend on port 3000, with frontend `/api` requests proxied to the backend. Production uses Nginx to proxy `/api/` to the private backend and all other paths to the frontend.

The Windows authoring host cannot verify Fedora/Linux package startup, SELinux, Nginx syntax, systemd, a production PostgreSQL migration, SMTP delivery, TLS, or firewall behavior. Verify those on the target Linux environment before enabling public traffic.
