import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { z } from "zod";
import { deletePrivateFile } from "@/lib/upload";
import { ADMIN_TEAM_SELECT } from "@/lib/admin-team-view";

/**
 * PATCH /api/admin/teams/:id
 * Edit a team (name, college, member info). SUPER_ADMIN only.
 * Body: { teamName?, college?, members?: [{id?, fullName, email, phone, college}] }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("team:approve");
    const { id } = await params;
    const body = await req.json();

    const team = await db.team.findUnique({ where: { id }, include: { members: true } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // Update team name + college
    const updateData: { teamName?: string; college?: string | null } = {};
    if (body.teamName && body.teamName !== team.teamName) {
      const clash = await db.team.findUnique({ where: { teamName: body.teamName } });
      if (clash && clash.id !== id) {
        return NextResponse.json({ error: "That team name is already in use." }, { status: 409 });
      }
      updateData.teamName = body.teamName;
    }
    if (body.college !== undefined) updateData.college = body.college || null;

    // Update members if provided
    if (Array.isArray(body.members)) {
      const membersSchema = z.array(z.object({
        id: z.string().optional(),
        fullName: z.string().min(2).max(100),
        email: z.string().email(),
        phone: z.string().min(10).max(15).regex(/^[+]?[\d\s\-()]+$/),
        college: z.string().min(2).max(150),
        degree: z.string().max(60).optional().or(z.literal("")),
      })).min(3, "Minimum 3 members").max(4, "Maximum 4 members");

      const parsed = membersSchema.safeParse(body.members);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid members", issues: parsed.error.issues }, { status: 400 });
      }
      // Transactional member update
      const newMemberIds = parsed.data.filter((m) => m.id).map((m) => m.id!);
      const currentMemberIds = new Set(team.members.map((member) => member.id));
      if (new Set(newMemberIds).size !== newMemberIds.length || newMemberIds.some((memberId) => !currentMemberIds.has(memberId))) {
        return NextResponse.json({ error: "Member IDs must be unique and belong to this team" }, { status: 400 });
      }
      if ((team.registrationId || team.status === "APPROVED") && newMemberIds.length !== team.members.length) {
        return NextResponse.json(
          { error: "Members cannot be added or removed after passes are issued" },
          { status: 409 },
        );
      }
      const removedImagePaths = team.members
        .filter((member) => !newMemberIds.includes(member.id) && member.participantImagePath)
        .map((member) => member.participantImagePath!);
      await db.$transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          await tx.team.update({ where: { id }, data: updateData });
        }

        // Delete members not in the new list
        await tx.participant.deleteMany({
          where: { teamId: id, id: { notIn: newMemberIds } },
        });

        // Upsert members
        for (const [index, m] of parsed.data.entries()) {
          if (m.id) {
            await tx.participant.update({
              where: { id: m.id },
              data: {
                fullName: m.fullName,
                email: m.email.toLowerCase().trim(),
                phone: m.phone.trim(),
                college: m.college,
                degree: m.degree || null,
                isLeader: index === 0,
              },
            });
          } else {
            await tx.participant.create({
              data: {
                teamId: id,
                fullName: m.fullName,
                email: m.email.toLowerCase().trim(),
                phone: m.phone.trim(),
                college: m.college,
                degree: m.degree || null,
                isLeader: index === 0,
              },
            });
          }
        }
      });
      await Promise.allSettled(removedImagePaths.map(deletePrivateFile));
    } else if (Object.keys(updateData).length > 0) {
      await db.team.update({ where: { id }, data: updateData });
    }

    const updated = await db.team.findUniqueOrThrow({ where: { id }, select: ADMIN_TEAM_SELECT });


    return NextResponse.json({ team: updated });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * DELETE /api/admin/teams/:id
 * Permanently deletes a team and all related records. SUPER_ADMIN only.
 *
 * Handles relationships:
 *   - PaymentScreenshot (cascade from Payment)
 *   - Payment (cascade from Team)
 *   - FoodCheckIn (cascade from Participant)
 *   - Participant (cascade from Team)
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("team:approve");
    const { id } = await params;

    const team = await db.team.findUnique({
      where: { id },
      include: {
        members: true,
        payment: { include: { screenshots: true } },
      },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });


    // Delete the team — cascades handle participants, payments, screenshots, food check-ins
    await db.team.delete({ where: { id } });
    const privateFiles = [
      ...team.members.map((member) => member.participantImagePath),
      ...(team.payment?.screenshots.map((screenshot) => screenshot.filePath) ?? []),
    ].filter((filePath): filePath is string => Boolean(filePath?.startsWith("private://")));
    await Promise.allSettled(privateFiles.map(deletePrivateFile));

    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err);
  }
}
