# Hackmitten 3.0 — Database Setup Guide

This document explains the complete database structure, how migrations work, and the exact commands needed to set up the PostgreSQL database from scratch.

---

## Database: PostgreSQL

The project uses **PostgreSQL ≥ 14** as its database. All database interaction goes through **Prisma ORM**.

The schema is defined in:

```
backend/prisma/schema.prisma
```

The actual SQL is auto-generated and lives in:

```
backend/prisma/migrations/
```

You **never need to write SQL manually.** Prisma handles it all.

---

## Tables Overview

### 1. `User`
Stores all staff/admin accounts.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (CUID) | Primary key |
| `username` | TEXT | Unique |
| `email` | TEXT | Unique |
| `name` | TEXT | Optional display name |
| `passwordHash` | TEXT | bcrypt hashed password |
| `role` | Enum | `SUPER_ADMIN`, `COORDINATOR`, `FOOD_ADMIN`, `PARTICIPANT` |
| `recoveryHash` | TEXT | Only set for SUPER_ADMIN (BERSERK recovery) |
| `createdAt` / `updatedAt` | TIMESTAMP | Auto-managed |

---

### 2. `EventConfig`
A **singleton row** that stores all event configuration (name, dates, registration status, prizes, hero text, etc.).

There is always exactly **one row** in this table with `id = 'singleton'`.

---

### 3. `Sponsor`
Stores event sponsors.

| Column | Notes |
|---|---|
| `name` | Sponsor name |
| `logoUrl` | URL to logo image |
| `websiteUrl` | Optional link |
| `tier` | `TITLE`, `PLATINUM`, `GOLD`, `SILVER`, `PARTNER`, `CUSTOM` |
| `sortOrder` | Controls display order |

---

### 4. `Team`
A registered team applying for the hackathon.

| Column | Notes |
|---|---|
| `teamName` | Unique team name |
| `registrationId` | Public-facing registration ID |
| `registrationAccessTokenHash` | Hashed token for accessing registration status |
| `status` | `DRAFT` → `SUBMITTED` → `PAYMENT_PENDING` → `PAYMENT_VERIFIED` → `APPROVED` / `REJECTED` |
| `college` | College name |
| `registrationAcknowledgementSentAt` | Email delivery tracking |
| `approvalEmailSentAt` / `rejectionEmailSentAt` | Decision email tracking |

---

### 5. `Participant`
Individual members of a team.

| Column | Notes |
|---|---|
| `teamId` | Foreign key → `Team` |
| `fullName`, `email`, `phone`, `college`, `degree` | Registration details |
| `participantImagePath` | Path to stored ID photo (private storage) |
| `isLeader` | Whether this person is the team leader |
| `participantId` | Generated unique ID after team approval |
| `qrToken` | Unique QR code token for check-in |
| `passVerified` | Whether physical ID was checked at entry |

---

### 6. `Payment`
One payment record per team.

| Column | Notes |
|---|---|
| `teamId` | Foreign key → `Team` (unique — one payment per team) |
| `transactionId` | UPI / bank transaction reference |
| `status` | `PENDING`, `VERIFIED`, `REJECTED` |
| `rejectionReason` | Optional reason if rejected |
| `verifiedById` | Foreign key → `User` (who approved/rejected) |

---

### 7. `PaymentScreenshot`
Uploaded payment proof images (multiple allowed per payment).

| Column | Notes |
|---|---|
| `paymentId` | Foreign key → `Payment` |
| `filePath` | Path in private storage |
| `mimeType`, `sizeBytes` | File metadata |

---

### 8. `Meal`
Each meal session at the event (Breakfast, Lunch, Dinner, etc.).

| Column | Notes |
|---|---|
| `type` | `BREAKFAST`, `LUNCH`, `SNACKS`, `DINNER`, `CUSTOM` |
| `label` | Display name |
| `date` | ISO date string for the specific day |
| `startTime` / `endTime` | Time window |
| `enabled` | Toggle to enable/disable the meal |

---

### 9. `FoodCheckIn`
Records when a participant was checked in for a meal.

| Column | Notes |
|---|---|
| `participantId` | Foreign key → `Participant` |
| `mealId` | Foreign key → `Meal` |
| `checkedInById` | Foreign key → `User` (the food admin who scanned) |
| Unique on | `(participantId, mealId)` — one check-in per meal per person |

---

## Migrations

All schema changes are tracked as versioned SQL migration files:

| Migration | What it does |
|---|---|
| `20260923050830_init` | **Initial schema** — creates all tables, enums, indexes |
| `20260923060000_update_registration_fee` | Updates default registration fee |
| `20260924000000_add_registration_acknowledgement_attempt` | Adds acknowledgement attempt tracking |
| `20260926000000_track_registration_acknowledgement_delivery` | Adds email delivery timestamp |
| `20260926010000_add_private_participant_images` | Adds participant ID photo storage fields |
| `20260926020000_track_decision_email_delivery` | Tracks approval/rejection email delivery |
| `20260926030000_static_site_config_cleanup` | Cleans up event config columns |
| `20260927000000_protect_registration_payment_access` | Adds access token hashing for payment links |
| `20260927010000_remove_audit_change_history` | Removes audit log table |
| `20260930000000_add_sponsors` | Adds `Sponsor` table |

Each migration is a real `.sql` file at:
```
backend/prisma/migrations/<timestamp_name>/migration.sql
```

---

## Setup Commands — Run in This Order

### Step 1: Create PostgreSQL role and database

Connect as the PostgreSQL superuser:

```sh
sudo -u postgres psql
```

Then run:

```sql
CREATE ROLE hackmitten LOGIN PASSWORD '<your-strong-password>';
CREATE DATABASE hackmitten OWNER hackmitten ENCODING 'UTF8';
\q
```

Update `DATABASE_URL` and `DIRECT_URL` in `backend/.env`:

```dotenv
DATABASE_URL="postgresql://hackmitten:<password>@127.0.0.1:5432/hackmitten"
DIRECT_URL="postgresql://hackmitten:<password>@127.0.0.1:5432/hackmitten"
```

---

### Step 2: Generate Prisma client

```sh
bun run db:generate
```

Generates the TypeScript Prisma client from `schema.prisma`. Required before build.

---

### Step 3: Validate the schema

```sh
bun run db:validate
```

Checks that `schema.prisma` is valid. Safe to run anytime.

---

### Step 4: Apply all migrations

```sh
bun run db:migrate:deploy
```

Runs **all 10 SQL migration files** in order against your PostgreSQL database. Creates all tables, enums, and indexes.

> ✅ Safe to run multiple times — Prisma tracks which migrations have already been applied.

---

### Step 5: Create admin accounts (first time only)

```sh
bun run db:bootstrap
```

Reads from `backend/.env` and creates 3 accounts in the `User` table:

| Variable group | Role created |
|---|---|
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `SUPER_ADMIN` |
| `COORDINATOR_USERNAME`, `COORDINATOR_EMAIL`, `COORDINATOR_PASSWORD` | `COORDINATOR` |
| `FOOD_ADMIN_USERNAME`, `FOOD_ADMIN_EMAIL`, `FOOD_ADMIN_PASSWORD` | `FOOD_ADMIN` |

> ⚠️ **Run this only once.** Running it again is a credential rotation — it will update the existing accounts.

---

## All Database Commands — Quick Reference

```sh
bun run db:generate          # Generate Prisma client (run before build)
bun run db:validate          # Validate schema.prisma
bun run db:migrate:deploy    # Apply all migrations (creates tables)
bun run db:bootstrap         # Create admin accounts (first time only)
```

---

## No Manual SQL Needed

The repo is fully self-contained. You do **not** need to write or run any SQL manually.
All SQL is in `backend/prisma/migrations/*/migration.sql` and is applied automatically by `bun run db:migrate:deploy`.
