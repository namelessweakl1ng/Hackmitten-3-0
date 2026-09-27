import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * GET /api/food/check-ins
 * Query params: mealId, q (search participant name/team), page, pageSize, date (YYYY-MM-DD)
 */
export async function GET(req: Request) {
  try {
    await requirePermission("food:view");
    const url = new URL(req.url);
    const mealId = url.searchParams.get("mealId");
    const q = url.searchParams.get("q")?.trim() ?? "";
    const date = url.searchParams.get("date"); // YYYY-MM-DD
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)));

    const where: any = {};
    if (mealId) where.mealId = mealId;
    if (q) {
      where.OR = [
        { participant: { fullName: { contains: q } } },
        { participant: { team: { teamName: { contains: q } } } },
        { participant: { participantId: { contains: q } } },
      ];
    }
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      where.createdAt = { gte: start, lte: end };
    }

    const [checkIns, total] = await Promise.all([
      db.foodCheckIn.findMany({
        where,
        include: {
          participant: { include: { team: { select: { teamName: true, registrationId: true } } } },
          meal: true,
          checkedInBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.foodCheckIn.count({ where }),
    ]);

    return NextResponse.json({
      checkIns,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return jsonError(err);
  }
}
