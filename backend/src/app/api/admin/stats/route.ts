import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { RegistrationStatus, PaymentStatus } from "@prisma/client";

/**
 * GET /api/admin/stats — dashboard counters
 */
export async function GET() {
  try {
    await requirePermission("dashboard:view");

    const [
      totalTeams,
      approvedTeams,
      pendingPayments,
      verifiedPayments,
      rejectedPayments,
      totalParticipants,
      totalFoodCheckIns,
      perMealCounts,
      recentCheckIns,
      recentRegistrations,
    ] = await Promise.all([
      db.team.count(),
      db.team.count({ where: { status: RegistrationStatus.APPROVED } }),
      db.payment.count({ where: { status: PaymentStatus.PENDING } }),
      db.payment.count({ where: { status: PaymentStatus.VERIFIED } }),
      db.payment.count({ where: { status: PaymentStatus.REJECTED } }),
      db.participant.count(),
      db.foodCheckIn.count(),
      db.meal.findMany({
        select: {
          id: true,
          type: true,
          label: true,
          _count: { select: { checkIns: true } },
        },
      }),
      db.foodCheckIn.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          participant: { select: { id: true, fullName: true, teamId: true, team: { select: { teamName: true, registrationId: true } } } },
          meal: { select: { label: true, type: true } },
        },
      }),
      db.team.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          teamName: true,
          registrationId: true,
          status: true,
          college: true,
          createdAt: true,
          members: { select: { id: true } },
          payment: { select: { status: true } },
        },
      }),
    ]);

    return NextResponse.json({
      counts: {
        totalTeams,
        approvedTeams,
        pendingPayments,
        verifiedPayments,
        rejectedPayments,
        totalParticipants,
        totalFoodCheckIns,
      },
      meals: perMealCounts.map((m) => ({
        id: m.id,
        type: m.type,
        label: m.label,
        checkInCount: m._count.checkIns,
      })),
      recentCheckIns,
      recentRegistrations,
    });
  } catch (err) {
    return jsonError(err);
  }
}
