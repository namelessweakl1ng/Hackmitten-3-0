import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodCheckInSchema } from "@/lib/validators";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

/**
 * POST /api/food/check-in
 * Body: { qrToken, mealId }
 *
 * Resolves participant from opaque token, then attempts to create a FoodCheckIn.
 * The DB unique constraint [participantId, mealId] guarantees duplicate prevention
 * even under concurrent scans.
 *
 * Returns:
 *   200 — checked in successfully (returns participant + meal + check-in time)
 *   409 — already checked in (returns previous check-in time)
 *   404 — invalid QR token / participant not approved
 */
export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("food:scan");
    const body = await req.json();
    const parsed = foodCheckInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { qrToken, mealId } = parsed.data;

    // QR credentials are opaque tokens; sequential participant IDs are never accepted as credentials.
    const participant = await db.participant.findUnique({
      where: { qrToken },
      include: { team: true },
    });
    if (!participant) {
      return NextResponse.json(
        { error: "Invalid QR — participant not found", code: "INVALID_QR" },
        { status: 404 },
      );
    }
    if (!participant.passVerified || participant.team.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Participant not approved", code: "NOT_APPROVED" },
        { status: 403 },
      );
    }

    const meal = await db.meal.findUnique({ where: { id: mealId } });
    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }
    if (!meal.enabled) {
      return NextResponse.json(
        { error: `${meal.label} check-in is currently disabled` },
        { status: 400 },
      );
    }

    try {
      const checkIn = await db.$transaction(async (tx) => {
        const created = await tx.foodCheckIn.create({
          data: {
            participantId: participant.id,
            mealId: meal.id,
            checkedInById: ctx.userId,
          },
          include: {
            participant: { include: { team: true } },
            meal: true,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: ctx.userId,
            teamId: participant.teamId,
            action: "FOOD_CHECKIN",
            detail: `${meal.label} - ${participant.fullName}`,
          },
        });
        return created;
      });

      return NextResponse.json({
        status: "CHECKED_IN",
        checkIn,
        participant: {
          id: participant.id,
          fullName: participant.fullName,
          participantId: participant.participantId,
        },
        team: {
          teamName: participant.team.teamName,
          registrationId: participant.team.registrationId,
        },
        meal: { label: meal.label, type: meal.type },
        checkedInAt: checkIn.createdAt,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Unique constraint — already checked in
        const existing = await db.foodCheckIn.findUnique({
          where: { participantId_mealId: { participantId: participant.id, mealId: meal.id } },
        });
        return NextResponse.json(
          {
            status: "ALREADY_CHECKED_IN",
            error: "Already checked in",
            code: "DUPLICATE",
            participant: {
              id: participant.id,
              fullName: participant.fullName,
              participantId: participant.participantId,
            },
            team: {
              teamName: participant.team.teamName,
              registrationId: participant.team.registrationId,
            },
            meal: { label: meal.label, type: meal.type },
            previousCheckInAt: existing?.createdAt ?? null,
          },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (err) {
    return jsonError(err);
  }
}
