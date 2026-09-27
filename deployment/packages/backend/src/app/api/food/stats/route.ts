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

    // Fetch the approved population and configured meals once.
    const [approvedParticipants, meals] = await Promise.all([
      db.participant.findMany({
        where: { passVerified: true, team: { status: "APPROVED" } },
        select: {
          id: true,
          fullName: true,
          participantId: true,
          team: { select: { teamName: true, registrationId: true } },
        },
        orderBy: { fullName: "asc" },
      }),
      db.meal.findMany({
        where: mealId ? { id: mealId } : { enabled: true },
        select: {
          id: true,
          type: true,
          label: true,
          date: true,
          startTime: true,
          endTime: true,
          enabled: true,
        },
        orderBy: [{ type: "asc" }, { label: "asc" }],
      }),
    ]);
    const totalApproved = approvedParticipants.length;
    const approvedIds = new Set(approvedParticipants.map((participant) => participant.id));
    const allCheckIns = meals.length
      ? await db.foodCheckIn.findMany({
          where: { mealId: { in: meals.map((meal) => meal.id) } },
          select: {
            mealId: true,
            participantId: true,
            createdAt: true,
            participant: {
              select: {
                fullName: true,
                participantId: true,
                team: { select: { teamName: true, registrationId: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : [];
    const checkInsByMeal = new Map(meals.map((meal) => [meal.id, [] as typeof allCheckIns]));
    for (const checkIn of allCheckIns) {
      if (approvedIds.has(checkIn.participantId)) {
        checkInsByMeal.get(checkIn.mealId)?.push(checkIn);
      }
    }

    const mealStats = meals.map((meal) => {
      const checkIns = checkInsByMeal.get(meal.id) ?? [];
      const eatenIds = new Set(checkIns.map((checkIn) => checkIn.participantId));
      const eaten = checkIns.map((checkIn) => ({
        participantId: checkIn.participant.participantId,
        fullName: checkIn.participant.fullName,
        teamName: checkIn.participant.team.teamName,
        registrationId: checkIn.participant.team.registrationId,
        checkedInAt: checkIn.createdAt.toISOString(),
      }));
      const notEaten = approvedParticipants
        .filter((participant) => !eatenIds.has(participant.id))
        .map((participant) => ({
          participantId: participant.participantId,
          fullName: participant.fullName,
          teamName: participant.team.teamName,
          registrationId: participant.team.registrationId,
        }));
      return {
        meal,
        totalApproved,
        eatenCount: eaten.length,
        notEatenCount: notEaten.length,
        eaten,
        notEaten,
      };
    });

    return NextResponse.json({ meals: mealStats, totalApproved });
  } catch (err) {
    return jsonError(err);
  }
}
