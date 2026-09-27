import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("user:manage");
    const { id } = await params;
    // Prevent deleting all super admins
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (target.role === "SUPER_ADMIN") {
      const superCount = await db.user.count({ where: { role: "SUPER_ADMIN" } });
      if (superCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last super admin" }, { status: 400 });
      }
    }
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err);
  }
}
