import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

/**
 * POST /api/admin/audit/bulk-delete
 * Body: { ids: string[] }
 * Permanently deletes multiple audit log entries. SUPER_ADMIN only.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("audit:view");
    if (ctx.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only super admin can delete logs" }, { status: 403 });
    }
    const body = await req.json();
    const ids = z.array(z.string()).min(1).max(1000).safeParse(body?.ids);
    if (!ids.success) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }
    const result = await db.auditLog.deleteMany({ where: { id: { in: ids.data } } });
    await writeAudit({
      userId: ctx.userId,
      action: "AUDIT_LOGS_BULK_DELETED",
      detail: `Deleted ${result.count} log entries`,
    });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (err) {
    return jsonError(err);
  }
}
