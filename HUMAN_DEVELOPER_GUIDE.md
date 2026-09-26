# Developer and operations guide

## Application map

- `/` renders fixed public content from TypeScript data and committed assets. No website-content API or CMS is used.
- `/register` creates a team, accepts payment details, and supports optional private participant photos.
- `/admin` provides team/payment review, registration controls, operational audit, and account management.
- `/coordinator` provides operational team views and CSV export.
- `/food-admin` and `/admin/meals` support meals and QR check-in.
- API handlers implement authentication, permission checks, database access, filesystem access, email, exports, and operational rules. Browser components do not import Prisma or filesystem modules.

## Authentication and authorization

NextAuth credentials login verifies bcrypt password hashes and the selected role against the database. API handlers use `requirePermission` from `src/lib/api-auth.ts` and the role matrix in `src/lib/permissions.ts`. Keep `NEXTAUTH_SECRET` private and configure the canonical HTTPS `NEXTAUTH_URL`. Nginx passes the expected host/protocol; the app does not trust arbitrary hosts.

Bootstrap provisions `hackmittenadmin2026`, `hackmitten2026`, and `hackmittenfood2026` from the protected runtime environment. Operators must supply each account email and password there; passwords are bcrypt-hashed and are not committed to source. The application has no plaintext password check or login bypass.

## Database and event configuration

PostgreSQL is the supported database. `prisma/schema.prisma` and forward-only migrations define its schema. Operational records include users, registration controls, teams, participants, payments, meals/check-ins, audit logs, and change history.

`EventConfig` contains only `registrationEnabled` and nullable `registrationLimit`. Static event dates/content, UPI ID, gallery, crew, partner/departments, and venue are source controlled. Team creation takes a PostgreSQL advisory transaction lock before checking capacity and inserting, so simultaneous submissions cannot exceed the configured limit. Food check-ins have a unique participant/meal constraint.

## Registration, payment, QR

Server-side validation requires 3–4 members, college and degree, valid contact data, and unique member email addresses per team. The first member is assigned as team leader; client leader flags are ignored. Team name and registration capacity are rechecked within the locked transaction. Payment status is separate from registration. Approval assigns registration/participant IDs and opaque random QR tokens. Food check-in validates the token and records a unique participant/meal row.

## Filesystem storage

Persistent data uses `HACKMITTEN_STORAGE_ROOT` (production: `/var/lib/hackmitten`) with public and private subdirectories. Participant photos and payment screenshots use private logical storage keys, generated names, restricted permissions, MIME/signature/decode validation, and authorized retrieval routes. Participant photos accept JPEG/PNG/WebP up to exactly 512,000 bytes. Nginx caps the registration multipart request at 2.1 MiB; the API cap is 2,080,768 bytes for four photo files plus multipart overhead. Next's `request.formData()` buffers this bounded request.

Keep storage outside release folders. Back up PostgreSQL and the storage root together. Private storage must never be mapped directly by Nginx.

## Email

All mail uses Nodemailer and authenticated SMTP. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` only in the protected runtime environment. Port 587 requires STARTTLS; port 465 uses implicit TLS. Gmail requires a Google account with 2-Step Verification and an App Password. Never commit SMTP credentials.

The team leader receives a receipt after team creation; SMTP failure does not undo the team and is not reported as a successful send. Acknowledgement attempts are leased and capped at three. Approval/rejection notifications follow the committed status transition. Successful delivery timestamps are stored on the Team row. SMTP failures are logged without credential, message body, or recipient details. There is no automatic status-email retry worker.

## Build, migration, deployment

Install locked dependencies and generate Prisma client before compilation:

```sh
bun install --frozen-lockfile
bun run db:validate
bun run db:generate
bun run lint
bun run typecheck
bun test
bun run build
```

`bun run build` compiles Next.js and prepares `.next/standalone`; it does not connect to or mutate the production database. Production schema changes run only through `bun run db:migrate:deploy`; initial operational account provisioning is a separate `bun run db:bootstrap` step. Deploy on Linux behind Nginx and supervise the standalone Node process with systemd. Follow [SETUP.md](SETUP.md) for provisioning, Nginx, systemd, migration, backup, restore, and release steps.

## Verification limitations

The Windows development environment cannot validate Fedora permissions, Nginx syntax, systemd behavior, real SMTP negotiation, or a production PostgreSQL migration. Validate those on the target Linux host with a backed-up database and controlled mail recipient before release. PostgreSQL integration tests skip without a dedicated disposable test database.
