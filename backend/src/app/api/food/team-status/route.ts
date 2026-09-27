import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * GET /api/food/team-status
 * Returns a team-level food consumption matrix.
 *
 * For each approved team, shows each member's check-in status across all meals.
 * Used for the team-level food visualization in the food dashboard.
 */
export async function GET() {
  try {
    await requirePermission("food:view");

    const meals = await db.meal.findMany({
      where: { enabled: true },
      orderBy: [{ type: "asc" }, { label: "asc" }],
    });

    const teams = await db.team.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        teamName: true,
        registrationId: true,
        members: {
          select: {
            id: true,
            fullName: true,
            participantId: true,
            isLeader: true,
            foodCheckIns: { select: { mealId: true, createdAt: true } },
          },
          orderBy: [{ isLeader: "desc" }, { fullName: "asc" }],
        },
      },
      orderBy: { registrationId: "asc" },
    });

    const teamStatus = teams.map((team) => ({
      id: team.id,
      teamName: team.teamName,
      registrationId: team.registrationId,
      members: team.members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        participantId: m.participantId,
        isLeader: m.isLeader,
        meals: meals.map((meal) => {
          const checkIn = m.foodCheckIns.find((c) => c.mealId === meal.id);
          return {
            mealId: meal.id,
            mealLabel: meal.label,
            mealType: meal.type,
            eaten: !!checkIn,
            checkedInAt: checkIn?.createdAt.toISOString() ?? null,
          };
        }),
      })),
    }));

    return NextResponse.json({ teams: teamStatus, meals });
  } catch (err) {
    return jsonError(err);
  }
}
