import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api-auth";

/**
 * GET /api/pass/:qrToken
 *
 * Returns participant pass info if the QR token resolves to an approved participant.
 * Does NOT leak sensitive personal data — only name, participant ID, team, registration ID.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ qrToken: string }> }) {
  try {
    const { qrToken } = await params;
    if (!/^[a-f0-9]{48}$/i.test(qrToken)) {
      return NextResponse.json({ error: "Invalid pass token" }, { status: 400 });
    }
    const participant = await db.participant.findUnique({
      where: { qrToken },
      select: {
        id: true,
        fullName: true,
        participantId: true,
        passVerified: true,
        team: { select: { teamName: true, registrationId: true, status: true } },
      },
    });
    if (!participant) {
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }
    if (!participant.passVerified || participant.team.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Pass not yet verified", code: "NOT_VERIFIED" },
        { status: 403 },
      );
    }
    return NextResponse.json({
      participant: {
        id: participant.id,
        fullName: participant.fullName,
        participantId: participant.participantId,
      },
      team: {
        teamName: participant.team.teamName,
        registrationId: participant.team.registrationId,
        status: participant.team.status,
      },
      event: {
        name: "Hackmitten 3.0",
      },
      verified: true,
    });
  } catch (err) {
    return jsonError(err);
  }
}
