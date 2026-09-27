import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requirePermission } from "@/lib/api-auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("registration:view");
    const { id } = await params;
    const team = await db.team.findUnique({
      where: { id },
      select: {
        id: true,
        teamName: true,
        registrationId: true,
        status: true,
        college: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            college: true,
            degree: true,
            isLeader: true,
            participantId: true,
            passVerified: true,
            createdAt: true,
            // Images are fetched through the permission-checked route.
            participantImageMimeType: true,
          },
          orderBy: [{ isLeader: "desc" }, { createdAt: "asc" }],
        },
        payment: {
          select: {
            id: true,
            status: true,
            transactionId: true,
            rejectionReason: true,
            verifiedAt: true,
            createdAt: true,
            updatedAt: true,
            verifiedBy: { select: { name: true, email: true } },
            screenshots: {
              select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ team }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return jsonError(err);
  }
}
