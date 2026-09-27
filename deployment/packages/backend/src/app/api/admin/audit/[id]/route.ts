import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { writeAudit } from "@/lib/audit";

/**
 * DELETE /api/admin/audit/:id
 * Permanently deletes a single audit log entry. SUPER_ADMIN only.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("audit:view"); // only super admin has this
    if (ctx.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only super admin can delete logs" }, { status: 403 });
    }
    const { id } = await params;
    const existing = await db.auditLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }
    await db.auditLog.delete({ where: { id } });
    // Record that a log was deleted (in a NEW audit log entry)
    await writeAudit({
      userId: ctx.userId,
      action: "AUDIT_LOG_DELETED",
      detail: `Deleted log ${id} (action: ${existing.action})`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err);
  }
}
