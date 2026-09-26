# Datacenter setup and operations

This manual targets a single Linux host running Nginx, one Next.js standalone Node.js service, PostgreSQL, and persistent local storage. No external database or object storage is required. Fedora is the development target; Ubuntu/Debian package names are noted below.

## 1. Architecture and prerequisites

```text
Users --HTTPS--> Nginx --127.0.0.1:3000--> Next.js (pages, APIs, auth)
                                             |             |
                                             v             v
                                         PostgreSQL   /var/lib/hackmitten
                                                       public/ private/
                              systemd supervises the Node.js process
```

Use a 64-bit Linux host, Node.js 20.9 or later, Bun matching the lockfile toolchain for build/database commands, PostgreSQL 14 or later, Nginx, and a DNS name with a valid TLS certificate. Reserve persistent disk space for PostgreSQL, uploaded files, and backups. Build the standalone artifact on Linux for the same CPU architecture as the datacenter host.

## 2. Fedora development setup

On Fedora, install the base packages and initialize/start PostgreSQL:

```sh
sudo dnf install -y git nginx postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Install a supported Node.js release and Bun from the organization's approved package mirror or verified upstream instructions. On Ubuntu/Debian, install `git nginx postgresql` with `apt` and enable/start PostgreSQL; install current Node.js and Bun from approved repositories. Create a local development database and restricted role as in section 3. Then:

```sh
git clone <approved-repository-url> hackmitten
cd hackmitten
bun install --frozen-lockfile
cp .env.example .env
# Edit .env with a disposable local PostgreSQL URL and local-only secrets.
bun run db:validate
bun run db:migrate
bun run db:bootstrap
bun run dev
```

Ubuntu/Debian use `apt` packages (`postgresql`, `nginx`, `nodejs` from an approved current repository) and `systemctl enable --now postgresql`. Verify Node and Bun versions before installing dependencies.

## 3. PostgreSQL provisioning and security

Keep PostgreSQL bound to localhost or a private database network. Do not expose port 5432 to user/LAN networks. Create a role and database using a privileged local administrator session; choose a strong secret and substitute it below:

```sql
CREATE ROLE hackmitten LOGIN PASSWORD '<generated-secret>';
CREATE DATABASE hackmitten OWNER hackmitten ENCODING 'UTF8';
```

Use the restricted application role for runtime access. Restrict database backups and credentials. Configure `DATABASE_URL` for runtime and `DIRECT_URL` for Prisma migrations (they may be identical on a local server). Use TLS if the database is remote.

## 4. Service account and persistent storage

```sh
sudo useradd --system --home-dir /opt/hackmitten --shell /sbin/nologin hackmitten
sudo install -d -o hackmitten -g hackmitten -m 0750 /opt/hackmitten/releases
sudo install -d -o hackmitten -g hackmitten -m 0750 /var/lib/hackmitten
sudo install -d -o hackmitten -g hackmitten -m 0755 /var/lib/hackmitten/public
sudo install -d -o hackmitten -g hackmitten -m 0700 /var/lib/hackmitten/private
sudo install -d -o root -g hackmitten -m 0750 /etc/hackmitten
```

Set `HACKMITTEN_STORAGE_ROOT=/var/lib/hackmitten`. Public website images are stored in `public/` and served through a constrained application endpoint. Payment screenshots and participant images are stored in `private/`; Nginx must never map this directory directly. Private images are served only by permission-checked application routes. Private files are created mode 0600 under a mode 0700 directory. Back up the database and storage root together.

The optional `HM3_PUBLIC_UPLOAD_DIR` and `HM3_PRIVATE_UPLOAD_DIR` variables override the corresponding subdirectories. Keep storage outside versioned release directories so restarts and release replacement do not remove uploads.

## 5. Environment and secrets

Create `/etc/hackmitten/hackmitten.env` with root ownership and mode 0640. Do not put it in a release archive or Git:

```dotenv
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3000
HACKMITTEN_STORAGE_ROOT=/var/lib/hackmitten
DATABASE_URL=postgresql://hackmitten:<secret>@127.0.0.1:5432/hackmitten
DIRECT_URL=postgresql://hackmitten:<secret>@127.0.0.1:5432/hackmitten
NEXTAUTH_URL=https://hackmitten.example.org
NEXTAUTH_SECRET=<generated-cryptographic-secret>
```

Set `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `HM3_BERSERK_SECRET` only for initial bootstrap or an explicitly planned credential reconciliation. Add `RESEND_API_KEY` and `EMAIL_FROM` if outbound email is configured. Protect the file and rotate credentials using the operator's secret-management process.

## 6. Build, artifact, and offline transfer

On a Linux build host with the locked dependencies available:

```sh
bun install --frozen-lockfile
bun run db:validate
bun run lint
bun run typecheck
bun test
bun run build
```

Build does not migrate or bootstrap a database. The runtime directory is `.next/standalone/`; it includes `server.js`, traced runtime modules, `.next/static`, and static public files. The preparation script excludes the old `public/uploads` directory. Never place `.env` or private storage in the build context/archive.

For an offline or restricted-network datacenter, stage the standalone server plus an operations directory containing `package.json`, `bun.lock`, `prisma/schema.prisma`, `prisma/migrations`, `prisma/migration_lock.toml`, `node_modules/prisma`, and `node_modules/@prisma` from the locked Linux build. Example on the Linux build host:

```sh
release=3.0.0
mkdir -p "dist/hackmitten-$release/runtime" "dist/hackmitten-$release/operations/node_modules"
cp -a .next/standalone/. "dist/hackmitten-$release/runtime/"
cp package.json bun.lock "dist/hackmitten-$release/operations/"
cp -a prisma "dist/hackmitten-$release/operations/"
cp -a node_modules/prisma node_modules/@prisma "dist/hackmitten-$release/operations/node_modules/"
tar -czf "hackmitten-$release-linux-x64.tar.gz" -C dist "hackmitten-$release"
sha256sum "hackmitten-$release-linux-x64.tar.gz" > "hackmitten-$release-linux-x64.tar.gz.sha256"
```

Adjust the architecture suffix as needed. Generate and verify the checksum, transfer through the approved channel, and unpack into a new `/opt/hackmitten/releases/<version>` directory. Keep a separate protected environment file. Do not copy source control secrets or local storage.

## 7. Initial database migration and bootstrap

From the release's operations directory, with the production environment loaded (or run with Bun and the locked dependencies installed):

```sh
bun run db:migrate:deploy
bun run db:bootstrap
```

When only the offline migration bundle is present, invoke the bundled CLI directly: `node node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma`.

Bootstrap is for initial provisioning and intentional operational-account reconciliation; it is not a routine per-release step. It does not seed demo records. Do not run `migrate reset`, `db push`, demo seeding, or destructive SQL in production. Review each forward migration and take a backup before applying it.

Before cutover from the former hosted screenshot provider, export the private bucket preserving object keys such as `payments/<file>`, and place that export in a protected directory on the migration host. Take coordinated DB and storage backups first. Then run the included local-only importer with production DB settings and the export path:

```sh
LEGACY_SCREENSHOT_EXPORT_DIR=/secure/import/payment-screenshots \
HACKMITTEN_STORAGE_ROOT=/var/lib/hackmitten \
bun run db:import-legacy-screenshots
```

The importer reads exported local files, validates image signatures, copies them into private storage with generated names and restrictive permissions, then updates each matching row. It does not connect to a hosted storage API. Keep the original export and backups intact until operators verify counts and sample retrievals; the application has no hosted storage fallback.

## 8. systemd

Install `deploy/hackmitten.service` as `/etc/systemd/system/hackmitten.service`; review the Node binary path and release path. Install the extracted release at `/opt/hackmitten/current` (a symlink to the selected version), then:

```sh
sudo chown root:root /etc/hackmitten/hackmitten.env
sudo chmod 0640 /etc/hackmitten/hackmitten.env
sudo systemctl daemon-reload
sudo systemctl enable --now hackmitten
sudo systemctl status hackmitten
sudo journalctl -u hackmitten -n 100 --no-pager
```

The service runs as an unprivileged `hackmitten` account, binds only to loopback, and may write only under `/var/lib/hackmitten` under the supplied systemd sandbox. For the first install, point `current` at the runtime directory inside the unpacked release (create the link only if it does not already exist): `sudo ln -s /opt/hackmitten/releases/<version>/runtime /opt/hackmitten/current`.

## 9. Nginx, HTTPS, and firewall

Install `deploy/nginx-limits.conf` under `/etc/nginx/conf.d/` and `deploy/nginx-hackmitten.conf` as a site/server config. Replace the sample host and certificate paths. Obtain certificates through the datacenter's approved ACME or certificate authority workflow. Validate and reload:

```sh
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Allow inbound 443 (and 80 only for redirect/certificate renewal) from approved networks. Keep 3000 bound to loopback and 5432 restricted to local/private DB clients. Nginx sets request limits for credential login and registration; adjust rates with the security/network owners. The server-level request cap supports the 8 MiB payment screenshot endpoint, while registration is capped at 5 MiB. Keep private storage outside Nginx document roots.

On Fedora, enable only approved services in firewalld (for example `sudo firewall-cmd --permanent --add-service=https`, optionally `--add-service=http`, then `sudo firewall-cmd --reload`). On Ubuntu/Debian with UFW, allow `443/tcp` and optional `80/tcp`. Do not open `3000/tcp` or `5432/tcp` to user networks.

## 10. Health, logs, backups, and restore

Check `https://hackmitten.example.org/api/health`; HTTP 200 means PostgreSQL readiness passed, 503 means it did not. The endpoint returns no credentials or database details. Use `systemctl status`, `journalctl -u hackmitten`, and PostgreSQL logs for diagnostics. Never log secrets, session tokens, private storage paths, or image contents.

Use the organization's encrypted, access-controlled backup destination. Back up PostgreSQL and `/var/lib/hackmitten` on a coordinated schedule; protect private participant/payment images. Example database backup and restore commands (run as an authorized DBA, substitute paths, and restore only to the intended recovery database):

```sh
pg_dump --format=custom --file=/approved-backup/hackmitten.dump --dbname="$DATABASE_URL"
sudo tar --acls --xattrs --numeric-owner -czf /approved-backup/hackmitten-files.tar.gz -C /var/lib hackmitten
pg_restore --no-owner --dbname="$RECOVERY_DATABASE_URL" /approved-backup/hackmitten.dump
```

Create a fresh, isolated recovery database before `pg_restore`; never point a restore command at the live production database. Restore storage from the matching protected snapshot, verify ownership/modes, run application smoke checks on the recovery host, then document the recovery point and operator approval before cutover. Regularly test restores.

Example storage restore to the isolated recovery host: `sudo tar --acls --xattrs --numeric-owner -xzf /approved-backup/hackmitten-files.tar.gz -C /var/lib`, followed by `sudo chown -R hackmitten:hackmitten /var/lib/hackmitten` and verification of `private/` mode 0700. Treat the archive as sensitive data.

## 11. Upgrade and rollback

1. Build and validate a new versioned Linux artifact; record its checksum.
2. Take coordinated PostgreSQL and storage backups and record the current release symlink.
3. Transfer and unpack the new release beside the old one; verify `sha256sum -c <archive>.sha256` before extracting.
4. Review and apply forward migrations with `bun run db:migrate:deploy`.
5. Atomically point `/opt/hackmitten/current` to the new release and restart the service. For example, `ln -s /opt/hackmitten/releases/<version> /opt/hackmitten/current.next && mv -Tf /opt/hackmitten/current.next /opt/hackmitten/current`.
6. Verify health, login, registration, image privacy, payment screenshot retrieval, CSV export, and logs.

If the app fails, point `current` to the old release and restart. This only rolls back application files. Do not reverse a schema migration by guesswork. If the old app cannot use the newer schema, restore the coordinated pre-upgrade database and storage snapshot to a recovery environment and follow the approved recovery/cutover procedure. Preserve the failed release and logs for diagnosis.

## 12. Troubleshooting and security checklist

- **Health 503:** check PostgreSQL service, `DATABASE_URL`, network ACLs, and database logs.
- **Login/session failures:** verify canonical HTTPS `NEXTAUTH_URL`, stable `NEXTAUTH_SECRET`, and forwarded host/protocol.
- **Upload failures:** check Nginx size limits, free disk, service ownership, and storage path values.
- **Private image 404:** verify database logical key and local private file backup/restore; never work around this by exposing the directory.
- **Migration failure:** stop rollout, preserve logs and backups, inspect migration status, and follow a reviewed forward repair.
- **Fedora SELinux denial:** inspect AVC records with `sudo ausearch -m AVC -ts recent`; restore standard labels with `sudo restorecon -Rv /var/lib/hackmitten /opt/hackmitten`. Keep SELinux enforcing; do not solve access issues by disabling it.

Confirm before handoff: no app/root privileges; PostgreSQL and Node listener not exposed publicly; secrets outside artifacts; TLS and firewall active; private path inaccessible through Nginx; storage and database backups encrypted and restorable; migration and rollback operator runbooks tested; rate limits reviewed; demo seeding disabled in production.
