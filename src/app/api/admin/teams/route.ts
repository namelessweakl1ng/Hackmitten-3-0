import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { writeAudit } from "@/lib/audit";
import { recordChange, snapshotRow } from "@/lib/change-history";
import { normalizeRegistrationMembers, registrationSchema } from "@/lib/validators";
import {
  generateQrToken,
  generateRegistrationId,
  generateParticipantId,
  nextRegistrationSequence,
} from "@/lib/constants";

/**
 * GET /api/admin/teams
 * Returns all teams (for admin team management). SUPER_ADMIN only.
 */
export async function GET() {
  try {
    await requirePermission("registration:view");
    const teams = await db.team.findMany({
      include: {
        members: { select: { id: true, fullName: true, isLeader: true, participantId: true, degree: true } },
        payment: { select: { id: true, status: true, transactionId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ teams });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * POST /api/admin/teams
 * Manually create a team (super admin). Supports immediate approval.
 * Body: { teamName, college, members: [{fullName, email, phone, college, degree}], status: "APPROVED" | "SUBMITTED" }
 *
 * Transactional — either the full team + members + payment are created, or nothing.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("team:approve"); // super admin only
    const body = await req.json();
    const parsed = registrationSchema.safeParse({
      teamName: body.teamName,
      college: body.college,
      members: body.members,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }
    const { teamName, college } = parsed.data;
    const members = normalizeRegistrationMembers(parsed.data.members);
    const wantApproved = body.status === "APPROVED";

    // Check team name uniqueness
    const existing = await db.team.findUnique({ where: { teamName } });
    if (existing) {
      return NextResponse.json(
        { error: "Team name already exists. Please choose a different team name.", code: "TEAM_NAME_TAKEN" },
        { status: 409 },
      );
    }

    // Transactional creation
    const result = await db.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          teamName,
          college: college ?? members[0]?.college ?? null,
          status: wantApproved ? "APPROVED" : "SUBMITTED",
        },
      });

      // Create members
      const createdMembers: Awaited<ReturnType<typeof tx.participant.create>>[] = [];
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const participant = await tx.participant.create({
          data: {
            teamId: team.id,
            fullName: m.fullName,
            email: m.email.toLowerCase().trim(),
            phone: m.phone.trim(),
            college: m.college,
            degree: m.degree || null,
            isLeader: m.isLeader,
          },
        });
        createdMembers.push(participant);
      }

      // If approved, generate registration ID + participant IDs + QR tokens
      if (wantApproved) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hackmitten-registration-sequence'))`;
        const allocatedIds = await tx.team.findMany({
          where: { registrationId: { not: null } },
          select: { registrationId: true },
        });
        const seq = nextRegistrationSequence(allocatedIds.map((row) => row.registrationId));
        const regId = generateRegistrationId(seq);

        await tx.team.update({
          where: { id: team.id },
          data: { status: "APPROVED", registrationId: regId },
        });

        for (let i = 0; i < createdMembers.length; i++) {
          await tx.participant.update({
            where: { id: createdMembers[i].id },
            data: {
              participantId: generateParticipantId(seq, i + 1),
              qrToken: generateQrToken(),
              passVerified: true,
            },
          });
        }

        // Create a verified payment record (manually approved)
        await tx.payment.create({
          data: {
            teamId: team.id,
            transactionId: `MANUAL-${regId}`,
            status: "VERIFIED",
            verifiedById: ctx.userId,
            verifiedAt: new Date(),
          },
        });
      }

      return tx.team.findUnique({
        where: { id: team.id },
        include: { members: true, payment: true },
      });
    });

    // Record change history + audit
    await recordChange({
      section: "TEAM",
      entityId: result!.id,
      entityType: "Team",
      action: wantApproved ? "MANUAL_CREATE_APPROVED" : "MANUAL_CREATE",
      previousState: null,
      newState: snapshotRow(result),
      changedById: ctx.userId,
    });
    await writeAudit({
      userId: ctx.userId,
      teamId: result!.id,
      action: "TEAM_MANUALLY_CREATED",
      detail: `${wantApproved ? "Approved" : "Submitted"} · ${teamName} · ${members.length} members`,
    });

    return NextResponse.json({ team: result }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
