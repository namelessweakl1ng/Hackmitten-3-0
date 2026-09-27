import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { participantImageFilename } from "@/lib/participant-image-filename";

/**
 * GET /api/coordinator/teams
 * Returns ONLY approved teams — for the coordinator portal.
 *
 * Returns coordinator display fields, QR tokens, and a safe image download filename.
 * Does not expose private image paths, payment details, emails, or phone numbers.
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
            participantImagePath: true,
            participantImageMimeType: true,
          },
          orderBy: { isLeader: "desc" },
        },
      },
      orderBy: { registrationId: "asc" },
    });
    return NextResponse.json({ teams: teams.map((team) => ({
      ...team,
      members: team.members.map(({ participantImagePath, participantImageMimeType, ...member }) => {
        const participantImageFileName = participantImagePath
          ? participantImageFilename(member.fullName, participantImageMimeType)
          : null;
        return {
          ...member,
          hasParticipantImage: Boolean(participantImageFileName),
          participantImageFileName,
        };
      }),
    })) });
  } catch (err) {
    return jsonError(err);
  }
}
