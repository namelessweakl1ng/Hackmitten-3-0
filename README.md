# Hackmitten 3.0

This repository has been organized into a clearer frontend/backend/shared boundary for Linux deployment.

## Current workspace structure

- [frontend](frontend): browser-facing UI and public event app
- [backend](backend): server-side API, auth, Prisma access, storage, SMTP, and authorization
- [shared](shared): reusable DTOs and cross-layer contracts
- [docs](docs): architecture, API, deployment, and security documentation
- [deployment](deployment): systemd, Nginx, and environment examples
- [tests](tests): integration boundary checks

## Frontend responsibility

The frontend owns only browser-facing UI and client state. It must not import Prisma, SMTP utilities, or database credentials. It communicates with the backend over HTTP endpoints.

## Backend responsibility

The backend owns the database, auth enforcement, private filesystem storage, email delivery, QR/pass logic, validation, and API authorization.

## Environment requirements

- [backend/.env.example](backend/.env.example): backend-only configuration
- [frontend/.env.example](frontend/.env.example): frontend-safe public variables only
- [deployment/environment](deployment/environment): datacenter environment templates

## Development entry points

- Root package orchestrates workspaces and common tasks.
- [frontend/package.json](frontend/package.json): frontend app scripts
- [backend/package.json](backend/package.json): backend app scripts
- [docs/api/API_CONTRACT.md](docs/api/API_CONTRACT.md): backend route contracts
- [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md): build and release packaging

## Build and run

Run `bun install`, then `bun run dev` to start the UI on port 3000 and API on port 3001. The frontend proxies same-origin `/api/*` calls to `BACKEND_API_ORIGIN`; the backend is the sole owner of API routes and server-side secrets. Run `bun run typecheck`, `bun run lint`, `bun test`, and `bun run build` for the repository gates. Production standalone artifacts are emitted under each package's `.next/standalone/<package>/` directory.
