/**
 * Hackmitten 3.0 — Production bootstrap seed.
 *
 * Creates ONLY:
 *   - Super admin account
 *   - Coordinator account (optional — only if both COORDINATOR_USERNAME and COORDINATOR_PASSWORD are set)
 *   - Food admin account (optional — only if both FOOD_ADMIN_USERNAME and FOOD_ADMIN_PASSWORD are set)
 *   - Event config singleton
 *   - Default meals (Breakfast, Lunch, Snacks, Dinner)
 *
 * Does NOT create:
 *   - required operational accounts and singleton registration controls
 *   - writes to .env.local or any other file
 *
 * Required env vars:
 *   ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *   HM3_BERSERK_SECRET
 *
 * Optional env vars:
 *   COORDINATOR_USERNAME, COORDINATOR_PASSWORD, COORDINATOR_EMAIL
 *   FOOD_ADMIN_USERNAME, FOOD_ADMIN_PASSWORD, FOOD_ADMIN_EMAIL
 *
 * Usage: bun run prisma/seed.ts
 */
import { PrismaClient, MealType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureSingletonEventConfig } from "../src/lib/bootstrap";
import { ensureOperationalUser, readCredentialGroup } from "../src/lib/operational-users";

const db = new PrismaClient();

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    console.error(`\n[FATAL] Missing required environment variable: ${name}`);
    console.error("Set it in your environment file or secret manager before running bootstrap.");
    console.error("The production bootstrap seed will not run with default credentials.\n");
    process.exit(1);
  }
  return v.trim();
}

async function main() {
  console.log("→ Hackmitten 3.0 — production bootstrap seed\n");

  // ─── Admin ──────────────────────────────────────────────────────────────
  const adminUsername = required("ADMIN_USERNAME");
  const adminEmail = required("ADMIN_EMAIL");
  const adminPassword = required("ADMIN_PASSWORD");

  const berserkSecret = required("HM3_BERSERK_SECRET");
  const coordinator = readCredentialGroup(process.env, "COORDINATOR");
  const foodAdmin = readCredentialGroup(process.env, "FOOD_ADMIN");
  if (!coordinator) throw new Error("COORDINATOR_USERNAME, COORDINATOR_EMAIL, and COORDINATOR_PASSWORD are required for bootstrap");
  if (!foodAdmin) throw new Error("FOOD_ADMIN_USERNAME, FOOD_ADMIN_EMAIL, and FOOD_ADMIN_PASSWORD are required for bootstrap");

  const berserkHash = await bcrypt.hash(berserkSecret, 12);

  const superAdmin = await ensureOperationalUser({
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    name: "Super Admin",
    role: "SUPER_ADMIN",
  });

  await db.user.update({
    where: { id: superAdmin.id },
    data: { recoveryHash: berserkHash },
  });
  console.log(`  ✓ super admin (${adminUsername})`);

  // ─── Required coordinator account ─────────────────────────────────────────────
  const coordinatorUser = await ensureOperationalUser({ ...coordinator, name: "Coordinator", role: "COORDINATOR" });
  console.log(`  coordinator provisioned (${coordinatorUser.username})`);

  const foodAdminUser = await ensureOperationalUser({ ...foodAdmin, name: "Food Admin", role: "FOOD_ADMIN" });
  console.log(`  food admin provisioned (${foodAdminUser.username})`);

  const eventCfg = await ensureSingletonEventConfig();
  console.log(`  ✓ event config ready (${eventCfg.id})`);

  // ─── Default meals ──────────────────────────────────────────────────────
  const meals = [
    { type: MealType.BREAKFAST, label: "Breakfast", enabled: true, startTime: "08:00", endTime: "10:00" },
    { type: MealType.LUNCH, label: "Lunch", enabled: true, startTime: "12:30", endTime: "14:00" },
    { type: MealType.SNACKS, label: "Snacks", enabled: true, startTime: "17:30", endTime: "18:30" },
    { type: MealType.DINNER, label: "Dinner", enabled: true, startTime: "20:30", endTime: "22:00" },
  ];
  for (const m of meals) {
    const id = `meal_${m.label.replace(/\W+/g, "_").toLowerCase()}`;
    await db.meal.upsert({
      where: { id },
      update: {},
      create: { id, ...m, date: null },
    });
  }
  console.log(`  ✓ ${meals.length} default meals (Breakfast, Lunch, Snacks, Dinner)`);

  const sponsors = [
    { id: "sponsor_vigyanlabs", name: "VigyanLabs", logoUrl: "/images/sponsors/Vlabs.jpeg", tier: "TITLE", sortOrder: 0 },
    { id: "sponsor_suce_step", name: "SUCE-STEP", logoUrl: "/images/sponsors/logo1.png", tier: "PARTNER", sortOrder: 1 },
    { id: "sponsor_cynefian", name: "CYNEFIAN Pvt. Ltd.", logoUrl: "/images/sponsors/logo2.png", tier: "PARTNER", sortOrder: 2 },
    { id: "sponsor_1by0grit", name: "1by0grit.com", logoUrl: "/images/sponsors/logo3.png", tier: "PARTNER", sortOrder: 3 },
  ];
  for (const sponsor of sponsors) {
    await db.sponsor.upsert({ where: { id: sponsor.id }, update: {}, create: sponsor });
  }
  console.log(`  ✓ ${sponsors.length} sponsors`);

  console.log("\n✅ Bootstrap seed complete.");
  console.log("  Login at /login with the super admin credentials you configured.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
