import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { csvDocument } from "@/lib/csv";
import { ADMIN_EXPORT_TEAM_SELECT, adminExportRows } from "@/lib/admin-export";

/**
 * GET /api/admin/export
 * Returns an allowlisted CSV of all registration, member and payment data.
 */
export async function GET() {
  try {
    await requirePermission("export:data");

    const teams = await db.team.findMany({
      select: ADMIN_EXPORT_TEAM_SELECT,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const csvText = csvDocument(adminExportRows(teams));
    return new Response(csvText, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'attachment; filename="hackmitten-registrations-' + new Date().toISOString().slice(0, 10) + '.csv"',
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
