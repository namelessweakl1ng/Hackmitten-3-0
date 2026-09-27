import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * GET /api/coordinator/teams
 * Returns ONLY approved teams — for the coordinator portal.
 *
 * Privacy: returns Team ID + Team Name + College + Members (name + participantId only).
 * Does NOT expose: payment screenshots, transaction IDs, emails, phones, or any super-admin-only data.
 */
export async function GET() {
  try {
    await requirePermission("dashboard:view"); // coordinator or super admin
    const teams = await db.team.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        teamName: true,
        registrationId: true,
        college: true,
        createdAt: true,
        _count: { select: { members: true } },
        members: {
          select: {
            id: true,
            fullName: true,
            participantId: true,
            qrToken: true,
            isLeader: true,
            college: true,
            degree: true,
          },
          orderBy: { isLeader: "desc" },
        },
      },
      orderBy: { registrationId: "asc" },
    });
    return NextResponse.json({ teams });
  } catch (err) {
    return jsonError(err);
  }
}
