# Deployment overview

## Components

- Frontend: Next.js standalone UI on 127.0.0.1:3000
- Backend: Next.js standalone API on 127.0.0.1:3001
- Database: PostgreSQL with Prisma
- Storage: Linux filesystem at /var/lib/hackmitten
- SMTP: managed mail relay
- Nginx: TLS terminator; routes `/api/*` to the backend and other requests to the frontend

## Build and artifacts

Run `bun install`, `bun run typecheck`, `bun run lint`, `bun test`, and `bun run build` from the repository root. `bun run build` produces standalone runtime trees in `frontend/.next/standalone/frontend` and `backend/.next/standalone/backend`; the build scripts copy each package's static assets beside its `server.js`.

The UI build must use the backend origin intended for its internal API proxy, for example `BACKEND_API_ORIGIN=http://127.0.0.1:3001`. This value is read at build time. The public Nginx configuration routes API traffic directly to the backend, so browser API requests remain same-origin.

After all validation gates pass, package the contents of those two standalone directories as `deployment/package/frontend` and `deployment/package/backend`. The frontend artifact runs with Node on port 3000; the backend artifact runs with Node on port 3001. Do not include `.env` files, local uploads, or production credentials in either artifact.

## Deployment files

- `deployment/nginx/hackmitten.conf`
- `deployment/systemd/hackmitten-frontend.service`
- `deployment/systemd/hackmitten-backend.service`
- `deployment/environment/frontend.env.example`
- `deployment/environment/backend.env.example`
- `deployment/scripts/verify-deployment.sh`
- `deployment/scripts/health-check.sh`

## Production notes

The backend alone receives database, NextAuth, SMTP, and storage settings. The frontend receives only public app configuration and `BACKEND_API_ORIGIN`. Configure real values in protected environment files or a secret manager; never include them in Git or deployment artifacts. Build and packaging do not run migrations; run reviewed migrations only as a separate, explicitly approved operation.
