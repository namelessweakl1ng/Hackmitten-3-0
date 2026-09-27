import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { sendEmail, approvalEmailHtml, approvalEmailText, type EmailResult } from "@/lib/email";
import {
  generateQrToken,
  generateRegistrationId,
  generateParticipantId,
  nextRegistrationSequence,
} from "@/lib/constants";

/**
 * POST /api/admin/teams/:id/approve
 *
 * Pre-conditions:
 *  - team.payment.status === VERIFIED
 *
 * Side effects (all in a transaction):
 *  - assign unique sequential registrationId (HM3-XXXXX)
 *  - assign participantId + qrToken to each member
 *  - mark team APPROVED
 *  - mark each participant passVerified = true
 *  - send the approval email to the team leader (only on the first approval)
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("team:approve");
    const { id } = await params;

    const team = await db.team.findUnique({
      where: { id },
      select: {
        id: true,
        teamName: true,
        status: true,
        payment: { select: { status: true } },
      },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (team.status === "APPROVED") {
      return NextResponse.json({ error: "Already approved" }, { status: 400 });
    }
    if (!team.payment || team.payment.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "Cannot approve team — payment not verified" },
        { status: 400 },
      );
    }

    // Detect the genuine first-time PENDING → APPROVED transition.
    // We only send approval emails when this is the team's FIRST approval —
    // i.e. the team has no registrationId yet (a re-approval after a revert
    // preserves the registrationId, so we skip the email in that case).
    // We also confirm the payment was actually verified (status === VERIFIED),
    // which is enforced above.

    // Transaction-safe generation of IDs and tokens
    const result = await db.$transaction(async (tx) => {
      // Serialize ID allocation and re-check current state after acquiring the lock.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hackmitten-registration-sequence'))`;
      const current = await tx.team.findUnique({ where: { id }, include: { payment: true } });
      if (!current) throw new Error("TEAM_NOT_FOUND");
      if (current.status === "APPROVED") throw new Error("TEAM_ALREADY_APPROVED");
      if (current.payment?.status !== "VERIFIED") throw new Error("PAYMENT_NOT_VERIFIED");
      const firstApproval = !current.registrationId;
      let regId = current.registrationId;
      if (firstApproval) {
        const allocatedIds = await tx.team.findMany({
          where: { registrationId: { not: null } },
          select: { registrationId: true },
        });
        const seq = nextRegistrationSequence(allocatedIds.map((row) => row.registrationId));
        regId = generateRegistrationId(seq);

        const members = await tx.participant.findMany({
          where: { teamId: id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true },
        });
        for (let index = 0; index < members.length; index++) {
          await tx.participant.update({
            where: { id: members[index].id },
            data: {
              participantId: generateParticipantId(seq, index + 1),
              qrToken: generateQrToken(),
              passVerified: true,
            },
          });
        }
      } else {
        // A reverted approval keeps its original passes; never rotate their QR tokens.
        const incomplete = await tx.participant.count({
          where: {
            teamId: id,
            OR: [{ participantId: null }, { qrToken: null }, { passVerified: false }],
          },
        });
        if (incomplete > 0) throw new Error("INCOMPLETE_PASSES");
      }

      const transition = await tx.team.updateMany({
        where: { id, status: { notIn: ["APPROVED", "REJECTED"] } },
        data: { status: "APPROVED", ...(firstApproval ? { registrationId: regId } : {}) },
      });
      if (transition.count !== 1) throw new Error("TEAM_STATUS_CHANGED");
      const updatedTeam = await tx.team.findUniqueOrThrow({
        where: { id },
        select: { id: true, teamName: true, status: true, registrationId: true },
      });
      return { team: updatedTeam, registrationId: regId!, firstApproval };
    });
    const regId = result.registrationId;

    // Send one approval email to the leader — ONLY on the first approval.
    // Re-approvals after a revert (registrationId already existed) skip the email
    // to avoid duplicate notifications.
    if (result.firstApproval) {
      // Wait for the provider attempt, but do not roll back committed approval
      // state when delivery is unavailable or rejected.
      const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "";
      const leader = await db.participant.findFirst({
        where: { teamId: id, isLeader: true },
        select: { email: true, qrToken: true, fullName: true, participantId: true },
      });
      let emailResult: EmailResult = { success: false, message: "Leader email or pass is missing", provider: "configuration" };
      if (!leader?.email || !leader.qrToken || !baseUrl) {
        console.error("[approval-email] delivery skipped", {
          teamId: id,
          reason: !baseUrl ? "NEXTAUTH_URL is missing" : "Leader email or pass is missing",
        });
      } else {
        const passUrl = `${baseUrl}/pass/${leader.qrToken}`;
        emailResult = await sendEmail({
          to: leader.email,
          subject: "Hackmitten 3.0 — Team Approved",
          html: approvalEmailHtml({
            participantName: leader.fullName,
            teamName: team.teamName,
            registrationId: regId,
            participantId: leader.participantId ?? "",
            passUrl,
            whatsappGroupUrl: "https://chat.whatsapp.com/CKjNXeNALPzAymQ0GhfMCj",
          }),
          text: approvalEmailText({
            participantName: leader.fullName,
            teamName: team.teamName,
            registrationId: regId,
            participantId: leader.participantId ?? "",
            passUrl,
            whatsappGroupUrl: "https://chat.whatsapp.com/CKjNXeNALPzAymQ0GhfMCj",
          }),
        });
        if (emailResult.success) {
          await db.team.updateMany({ where: { id, status: "APPROVED", approvalEmailSentAt: null }, data: { approvalEmailSentAt: new Date() } });
        } else {
          console.error("[approval-email] delivery failed", {
            teamId: id,
            provider: emailResult.provider,
          });
        }
      }
      return NextResponse.json({ team: result.team, emailSent: emailResult.success });
    } else {
      console.log("[approval-email] duplicate suppressed", { teamId: id, reason: "re-approval" });
    }

    return NextResponse.json({ team: result.team });
  } catch (err) {
    if (err instanceof Error && err.message === "INCOMPLETE_PASSES") {
      return NextResponse.json({ error: "Existing passes are incomplete; approval cannot be safely restored" }, { status: 409 });
    }
    if (err instanceof Error && err.message === "TEAM_NOT_FOUND") {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "TEAM_ALREADY_APPROVED") {
      return NextResponse.json({ error: "Already approved" }, { status: 409 });
    }
    if (err instanceof Error && err.message === "TEAM_STATUS_CHANGED") {
      return NextResponse.json({ error: "Team status has already changed" }, { status: 409 });
    }
    if (err instanceof Error && err.message === "PAYMENT_NOT_VERIFIED") {
      return NextResponse.json({ error: "Cannot approve team: payment is not verified" }, { status: 400 });
    }
    return jsonError(err);
  }
}

/**
 * POST /api/admin/teams/:id/approve with action=revert
 * Reverts an approved team back to PAYMENT_VERIFIED (undo accidental approval).
 * Preserves registrationId and participant credentials so they can be re-approved if needed.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("team:approve");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (body?.action !== "revert") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const team = await db.team.findUnique({ where: { id }, select: { status: true } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (team.status !== "APPROVED") {
      return NextResponse.json({ error: "Team is not approved" }, { status: 400 });
    }
    const updated = await db.team.update({
      where: { id },
      data: { status: "PAYMENT_VERIFIED" },
      select: { id: true, teamName: true, registrationId: true, status: true },
    });
    return NextResponse.json({ team: updated });
  } catch (err) {
    return jsonError(err);
  }
}
