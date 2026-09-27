# Hackmitten 3.0 architecture

This repository now separates responsibilities into three explicit layers:

- frontend: browser-facing UI and public site
- backend: server-side API, auth, Prisma, storage, SMTP and authorization
- shared: intentionally reusable Typescript contracts and DTOs

## Runtime boundary

The frontend is a Next.js app that speaks to the backend over HTTP. It does not own Prisma, SMTP, filesystems, or secrets.

The backend is the only component allowed to:

- access PostgreSQL through Prisma
- read and write the Linux filesystem under the private/public upload directories
- send transactional email using SMTP
- enforce role-based authorization on each sensitive route
- expose the API contract for registrations, auth, health, passes, food, admin, uploads, and exports

## Deployment model

- Frontend: local/private port, e.g. 127.0.0.1:3000
- Backend: local/private port, e.g. 127.0.0.1:3001
- Nginx: public HTTPS terminator in front of both apps
- PostgreSQL: managed database service or self-hosted instance
- Storage: Linux filesystem under /var/lib/hackmitten

## Important rules

- No Prisma imports in frontend code
- No SMTP credentials in frontend code
- No public direct access to private upload files
- No direct database mutation from frontend components
- No Resend/Vercel/Supabase storage reintroduction
