import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * GET /api/food/stats
 * Returns meal consumption statistics for the food dashboard.
 *
 * For each enabled meal:
 *   - total approved participants
 *   - eaten count
 *   - not eaten count
 *   - list of eaten participants (with check-in time)
 *   - list of not-eaten participants
 *
 * All counts are calculated from real DB records.
 */
export async function GET(req: Request) {
  try {
    await requirePermission("food:view");
    const url = new URL(req.url);
    const mealId = url.searchParams.get("mealId");

    // Get all approved participants (the universe of people who can eat)
    const approvedParticipants = await db.participant.findMany({
      where: { passVerified: true, team: { status: "APPROVED" } },
      select: {
        id: true,
        fullName: true,
        participantId: true,
        teamId: true,
        team: { select: { teamName: true, registrationId: true } },
      },
      orderBy: { fullName: "asc" },
    });

    const totalApproved = approvedParticipants.length;

    // Get all enabled meals
    const meals = await db.meal.findMany({
      where: mealId ? { id: mealId } : { enabled: true },
      orderBy: [{ type: "asc" }, { label: "asc" }],
    });

    // For each meal, compute eaten / not-eaten
    const mealStats = await Promise.all(
      meals.map(async (meal) => {
        const checkIns = await db.foodCheckIn.findMany({
          where: { mealId: meal.id },
          include: {
            participant: {
              select: {
                id: true,
                fullName: true,
                participantId: true,
                team: { select: { teamName: true, registrationId: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        const eatenIds = new Set(checkIns.map((c) => c.participantId));
        const eaten = checkIns.map((c) => ({
          participantId: c.participant.participantId,
          fullName: c.participant.fullName,
          teamName: c.participant.team.teamName,
          registrationId: c.participant.team.registrationId,
          checkedInAt: c.createdAt.toISOString(),
        }));
        const notEaten = approvedParticipants
          .filter((p) => !eatenIds.has(p.id))
          .map((p) => ({
            participantId: p.participantId,
            fullName: p.fullName,
            teamName: p.team.teamName,
            registrationId: p.team.registrationId,
          }));

        return {
          meal: {
            id: meal.id,
            type: meal.type,
            label: meal.label,
            date: meal.date,
            startTime: meal.startTime,
            endTime: meal.endTime,
            enabled: meal.enabled,
          },
          totalApproved,
          eatenCount: eaten.length,
          notEatenCount: notEaten.length,
          eaten,
          notEaten,
        };
      }),
    );

    return NextResponse.json({ meals: mealStats, totalApproved });
  } catch (err) {
    return jsonError(err);
  }
}
