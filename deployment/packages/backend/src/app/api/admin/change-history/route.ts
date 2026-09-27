import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * GET /api/admin/change-history
 * Returns paginated change history entries (most recent first).
 *
 * Query params: section, page, pageSize
 *
 * Visible to SUPER_ADMIN only — this is a sensitive audit trail.
 */
export async function GET(req: Request) {
  try {
    await requirePermission("audit:view");
    const url = new URL(req.url);
    const section = url.searchParams.get("section")?.trim() ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "30", 10)));

    const where: any = {};
    if (section) where.section = section;

    const [entries, total] = await Promise.all([
      db.changeHistory.findMany({
        where,
        include: {
          changedBy: { select: { id: true, email: true, name: true, role: true } },
          rolledBackBy: { select: { id: true, email: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.changeHistory.count({ where }),
    ]);

    return NextResponse.json({
      entries: entries.map((e) => ({
        ...e,
        previousState: safeParse(e.previousState),
        newState: safeParse(e.newState),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return jsonError(err);
  }
}

function safeParse(s: string | null): any {
  if (!s || s === "null") return null;
  try { return JSON.parse(s); } catch { return null; }
}
