# Architecture audit and migration plan

Audit baseline: commit `1199e2263e1600663cb82136694943b73fd0dbd2`.

## Existing application

- One Next.js 16 App Router project served by one standalone Node server on port 3000.
- Public, registration, login, admin, coordinator, and food coordinator pages live under `src/app`; 39 route handlers live under `src/app/api`.
- There are no Server Actions and no middleware. Several protected page components call `getServerSession`; all browser data operations call same-origin `/api/*` routes.
- NextAuth Credentials provider authenticates against Prisma, issues a seven-day JWT session cookie, and supplies a role claim. `src/lib/api-auth.ts` checks backend session and permissions for protected route handlers. Browser role checks are presentation only.
- Prisma/PostgreSQL, SMTP (Nodemailer), registration capacity/transactions, CSV generation, QR/pass lookup, meal transactions, and filesystem writes are server-side in API routes and `src/lib`.
- Participant and payment images use private local storage through `HACKMITTEN_STORAGE_ROOT`; static site imagery is committed below `public/images`. Admin participant image and payment screenshot retrieval is permission checked. Public upload compatibility routes are separate from private image routes.
- Build is `next build` followed by standalone output preparation. Prisma generation, migrations, and bootstrap are separate commands. Existing Nginx and systemd examples describe one combined app, not split services.

## Server-dependent UI coupling found

- UI routes currently call `getServerSession` from server-rendered pages. A frontend-only package cannot import backend auth configuration or require database/session secrets. Replace those page guards with client-side session presentation gates; API authorization remains authoritative.
- UI and NextAuth use same-origin `/api` paths and cookies. Preserve this contract with Nginx serving the frontend origin and proxying `/api/` to a private backend listener. This avoids cross-site cookie/CORS behavior in the supported production topology. Direct cross-origin credentialed auth is not the deployment mode.
- API routes are already the only database/filesystem/SMTP interface; no browser code imports Prisma or server mail/storage modules.

## Migration plan

1. Keep application source in the repository; make only necessary frontend session-boundary changes.
2. Add reproducible packaging scripts which stage only UI routes/assets for frontend and only API routes/server libraries/schema/migrations for backend. Give the two packages separate manifests and environment examples; dependency installation occurs on the Linux target/build host.
3. Build each package independently with Next standalone output; backend receives a minimal root layout and no website pages. Frontend contains no API handlers, Prisma schema/client, SMTP/storage/auth server modules, or secret-bearing environment file.
4. Define the backend API and error contract, configurable CORS allow-list (same-origin proxy is default), separate systemd units, and Nginx routing to private loopback listeners.
5. Keep Prisma generation, migration deploy, and bootstrap as explicit backend operations. Create tarballs and checksums only from a Linux build host; this Windows environment has no usable WSL or Docker runtime, so Linux-native standalone artifacts cannot be truthfully built here.

## Verification boundaries

Existing checks establish the monolith baseline only. After package scripts exist, validate frontend and backend TypeScript/build/package contents separately. PostgreSQL integration, SMTP, Linux permissions, systemd, Nginx, and datacenter addressing require the target infrastructure and must not be represented as verified locally.
