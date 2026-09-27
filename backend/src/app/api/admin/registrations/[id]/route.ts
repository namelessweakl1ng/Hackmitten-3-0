import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * GET /api/admin/registrations/:id — full detail incl. payment screenshots
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("registration:view");
    const { id } = await params;
    const team = await db.team.findUnique({
      where: { id },
      include: {
        members: true,
        payment: {
          include: {
            screenshots: true,
            verifiedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ team });
  } catch (err) {
    return jsonError(err);
  }
}
