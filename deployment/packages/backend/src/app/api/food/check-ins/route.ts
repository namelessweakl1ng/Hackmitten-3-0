import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
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
    const positiveInt = (value: string | null, fallback: number, max: number) => {
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback;
    };
    const page = positiveInt(url.searchParams.get("page"), 1, 1_000_000);
    const pageSize = positiveInt(url.searchParams.get("pageSize"), 50, 200);

    const where: Prisma.FoodCheckInWhereInput = {};
    if (mealId) where.mealId = mealId;
    if (q) {
      where.OR = [
        { participant: { fullName: { contains: q } } },
        { participant: { team: { teamName: { contains: q } } } },
        { participant: { participantId: { contains: q } } },
      ];
    }
    if (date) {
      const start = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00+05:30`)
        : new Date(Number.NaN);
      if (!Number.isFinite(start.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      where.createdAt = { gte: start, lt: end };
    }

    const [checkIns, total] = await Promise.all([
      db.foodCheckIn.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          participant: {
            select: {
              id: true,
              fullName: true,
              participantId: true,
              team: { select: { teamName: true, registrationId: true } },
            },
          },
          meal: { select: { id: true, label: true, type: true } },
          checkedInBy: { select: { name: true, email: true } },
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
