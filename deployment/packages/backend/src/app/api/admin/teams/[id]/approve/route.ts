import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { recordChange, snapshotRow } from "@/lib/change-history";
import { writeAudit } from "@/lib/audit";
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
 *  - write audit log + change history (enables rollback)
 *  - send the approval email to the team leader (only on the first approval)
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("team:approve");
    const { id } = await params;

    const team = await db.team.findUnique({
      where: { id },
      include: { payment: true, members: true },
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

    // Capture previous state for rollback
    const previousSnapshot = snapshotRow(team);
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
      const allocatedIds = await tx.team.findMany({
        where: { registrationId: { not: null } },
        select: { registrationId: true },
      });
      const seq = nextRegistrationSequence(allocatedIds.map((row) => row.registrationId));
      const regId = generateRegistrationId(seq);
      const transition = await tx.team.updateMany({
        where: { id, status: { notIn: ["APPROVED", "REJECTED"] } },
        data: { status: "APPROVED", registrationId: regId },
      });
      if (transition.count !== 1) throw new Error("TEAM_STATUS_CHANGED");
      const updatedTeam = await tx.team.findUniqueOrThrow({ where: { id } });

      // Assign participant IDs + opaque QR tokens
      const members = await tx.participant.findMany({
        where: { teamId: id },
        orderBy: { createdAt: "asc" },
      });
      for (let i = 0; i < members.length; i++) {
        const p = members[i];
        await tx.participant.update({
          where: { id: p.id },
          data: {
            participantId: generateParticipantId(seq, i + 1),
            qrToken: generateQrToken(),
            passVerified: true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: ctx.userId,
          teamId: id,
          action: "TEAM_APPROVED",
          detail: `Registration ID ${regId}; ${members.length} participants${current.registrationId ? " (re-approval; no email sent)" : ""}`,
        },
      });
      await tx.changeHistory.create({
        data: {
          section: "TEAM",
          entityId: id,
          entityType: "Team",
          action: "APPROVE",
          previousState: JSON.stringify(previousSnapshot),
          newState: JSON.stringify(snapshotRow(updatedTeam)),
          changedById: ctx.userId,
        },
      });

      return { team: updatedTeam, registrationId: regId, firstApproval: !current.registrationId };
    });
    const regId = result.registrationId;

    // Send one approval email to the leader — ONLY on the first approval.
    // Re-approvals after a revert (registrationId already existed) skip the email
    // to avoid duplicate notifications.
    const refreshed = await db.team.findUnique({
      where: { id },
      include: { members: true, payment: true },
    });

    if (result.firstApproval) {
      // Wait for the provider attempt, but do not roll back committed approval
      // state when delivery is unavailable or rejected.
      const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "";
      const leader = refreshed?.members.find((member) => member.isLeader);
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
      return NextResponse.json({ team: refreshed, emailSent: emailResult.success });
    } else {
      console.log("[approval-email] duplicate suppressed", { teamId: id, reason: "re-approval" });
    }

    return NextResponse.json({ team: refreshed });
  } catch (err) {
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
    const ctx = await requirePermission("team:approve");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (body?.action !== "revert") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const team = await db.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (team.status !== "APPROVED") {
      return NextResponse.json({ error: "Team is not approved" }, { status: 400 });
    }
    const previousSnapshot = snapshotRow(team);
    const updated = await db.team.update({
      where: { id },
      data: { status: "PAYMENT_VERIFIED" },
    });
    await recordChange({
      section: "TEAM",
      entityId: id,
      entityType: "Team",
      action: "REVERT_APPROVAL",
      previousState: previousSnapshot,
      newState: snapshotRow(updated),
      changedById: ctx.userId,
    });
    await writeAudit({
      userId: ctx.userId,
      teamId: id,
      action: "TEAM_APPROVAL_REVERTED",
      detail: `Reverted from APPROVED to PAYMENT_VERIFIED (registration ID ${team.registrationId} preserved)`,
    });
    return NextResponse.json({ team: updated });
  } catch (err) {
    return jsonError(err);
  }
}
