/**
 * Duplicate food check-in prevention test (DB integration).
 *
 * Verifies that:
 *  - A participant can check in for a meal once
 *  - The same participant cannot check in for the same meal again
 *  - The unique constraint [participantId, mealId] enforces this even at the DB level
 *
 * Run: bun test tests/food-checkin.test.ts
 *
 * NOTE: This test mutates the dev database. Run `bun run prisma/seed-demo.ts`
 * afterwards to restore consistent demo data.
 *
 * The test suite is auto-skipped when DATABASE_URL is missing or not a
 * PostgreSQL URL, so `bun test` still passes in environments without a
 * live Postgres connection (e.g. CI without a service container).
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PrismaClient, RegistrationStatus, PaymentStatus, MealType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateQrToken } from "../src/lib/constants";

const dbUrl = process.env.TEST_DATABASE_URL ?? "";
const hasPostgres =
  dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");

describe.skipIf(!hasPostgres)("duplicate food check-in prevention", () => {
  const db = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  let foodAdminId: string;
  let participantId: string;
  let mealId: string;
  let teamId: string;

  beforeAll(async () => {
    // Ensure a food admin user exists
    const existing = await db.user.findUnique({ where: { username: "food_test_admin" } });
    const admin = existing ?? await db.user.create({
      data: {
        username: "food_test_admin",
        email: "food-test@hackmitten.example",
        name: "Food Test Admin",
        role: Role.FOOD_ADMIN,
        passwordHash: await bcrypt.hash("test", 10),
      },
    });
    foodAdminId = admin.id;

    // Ensure lunch meal exists (type is no longer unique — use findFirst + create)
    let lunch = await db.meal.findFirst({ where: { type: MealType.LUNCH } });
    if (!lunch) {
      lunch = await db.meal.create({
        data: { type: MealType.LUNCH, label: "Lunch", enabled: true, startTime: "12:00", endTime: "14:00" },
      });
    }
    mealId = lunch.id;

    // Create an approved team with one participant that has a QR token
    const stamp = Date.now();
    const team = await db.team.create({
      data: {
        teamName: `TestFood_${stamp}`,
        status: RegistrationStatus.APPROVED,
        registrationId: `HM3-TEST-${stamp}`,
        members: {
          create: {
            fullName: "Food Test Participant",
            email: `food-test-${stamp}@example.com`,
            phone: "+91 9999999999",
            college: "Test College",
            qrToken: generateQrToken(),
            participantId: `HM3-P-TEST-${stamp}-01`,
            passVerified: true,
          },
        },
        payment: {
          create: {
            transactionId: `TXN-TEST-${stamp}`,
            status: PaymentStatus.VERIFIED,
            verifiedById: foodAdminId,
            verifiedAt: new Date(),
          },
        },
      },
      include: { members: true },
    });
    teamId = team.id;
    participantId = team.members[0].id;
  });

  it("allows the first check-in for a meal", async () => {
    const checkIn = await db.foodCheckIn.create({
      data: { participantId, mealId, checkedInById: foodAdminId },
    });
    expect(checkIn).toBeDefined();
    expect(checkIn.participantId).toBe(participantId);
    expect(checkIn.mealId).toBe(mealId);
  });

  it("rejects the second check-in for the same meal (DB unique constraint)", async () => {
    let threw = false;
    let errorCode: string | undefined;
    try {
      await db.foodCheckIn.create({
        data: { participantId, mealId, checkedInById: foodAdminId },
      });
    } catch (err: any) {
      threw = true;
      errorCode = err.code;
    }
    expect(threw).toBe(true);
    // P2002 = Prisma unique constraint violation
    expect(errorCode).toBe("P2002");
  });

  it("allows the same participant to check in for a different meal", async () => {
    let dinner = await db.meal.findFirst({ where: { type: MealType.DINNER } });
    if (!dinner) {
      dinner = await db.meal.create({
        data: { type: MealType.DINNER, label: "Dinner", enabled: true, startTime: "20:00", endTime: "22:00" },
      });
    }
    const checkIn = await db.foodCheckIn.create({
      data: { participantId, mealId: dinner.id, checkedInById: foodAdminId },
    });
    expect(checkIn).toBeDefined();
    expect(checkIn.mealId).toBe(dinner.id);
  });

  it("allows a different participant to check in for the same meal", async () => {
    // Add a second participant to the same team
    const stamp = Date.now();
    const p2 = await db.participant.create({
      data: {
        teamId,
        fullName: "Second Test Participant",
        email: `food-test-2-${stamp}@example.com`,
        phone: "+91 8888888888",
        college: "Test College",
        qrToken: generateQrToken(),
        participantId: `HM3-P-TEST-${stamp}-02`,
        passVerified: true,
      },
    });
    const checkIn = await db.foodCheckIn.create({
      data: { participantId: p2.id, mealId, checkedInById: foodAdminId },
    });
    expect(checkIn).toBeDefined();
    expect(checkIn.participantId).toBe(p2.id);
  });
});

describe.skipIf(hasPostgres)("duplicate food check-in prevention (skipped: no Postgres DATABASE_URL)", () => {
  it("is skipped when DATABASE_URL is not a postgres URL", () => {
    expect(hasPostgres).toBe(false);
  });
});

