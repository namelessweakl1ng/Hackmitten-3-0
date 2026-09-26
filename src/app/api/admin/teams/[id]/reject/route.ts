import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail, rejectionEmailHtml, rejectionEmailText } from "@/lib/email";

/**
 * POST /api/admin/teams/:id/reject
 * Body: { reason: string }
 * Rejects the team entirely. Team status → REJECTED.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("team:reject");
    const { id } = await params;
    const body = await req.json();
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 3) {
      return NextResponse.json({ error: "Reason required" }, { status: 400 });
    }

    const team = await db.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (team.status === "APPROVED") {
      return NextResponse.json({ error: "Cannot reject an approved team" }, { status: 400 });
    }

    const transition = await db.team.updateMany({
      where: { id, status: { notIn: ["APPROVED", "REJECTED"] } },
      data: { status: "REJECTED" },
    });
    if (transition.count !== 1) return NextResponse.json({ error: "Team status has already changed" }, { status: 409 });
    const updated = await db.team.findUnique({ where: { id }, include: { members: true } });
    if (!updated) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    await writeAudit({
      userId: ctx.userId,
      teamId: id,
      action: "TEAM_REJECTED",
      detail: reason,
    });

    const leader = updated.members.find((member) => member.isLeader);
    if (leader?.email) {
      const sent = await sendEmail({
        to: leader.email,
        subject: "Hackmitten 3.0 — Registration Update",
        html: rejectionEmailHtml(updated.teamName),
        text: rejectionEmailText(updated.teamName),
      });
      if (sent.success) {
        await db.team.updateMany({ where: { id, status: "REJECTED", rejectionEmailSentAt: null }, data: { rejectionEmailSentAt: new Date() } });
      } else {
        console.error("[rejection-email] delivery failed", { teamId: id, provider: sent.provider });
      }
    }

    return NextResponse.json({ team: updated });
  } catch (err) {
    return jsonError(err);
  }
}
