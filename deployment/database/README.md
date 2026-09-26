# PostgreSQL operations

PostgreSQL is accessed only by the backend through Prisma. Create an empty production database and restricted application/migration credentials according to the datacenter's database standards. Keep database network access private to the backend host.

From the extracted backend source package, with the protected backend environment loaded:

```sh
bun run db:validate
bun run db:generate
bun run db:migrate:deploy
```

Bootstrap the operational accounts only as a separate approved operation:

```sh
bun run db:bootstrap
```

Take a consistent PostgreSQL backup together with `/var/lib/hackmitten` before changes. Example backup and restore commands are in the root `SETUP.md`; validate restore to an isolated database/storage root before relying on it. Migrations are forward-only; roll back application code separately and use a reviewed forward fix or consistent backup for schema/data issues.
