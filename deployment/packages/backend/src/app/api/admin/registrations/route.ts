import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * GET /api/admin/registrations
 * Query params: q (search), status, paymentStatus, college, page, pageSize
 */
export async function GET(req: Request) {
  try {
    await requirePermission("registration:view");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const status = url.searchParams.get("status");
    const paymentStatus = url.searchParams.get("paymentStatus");
    const college = url.searchParams.get("college")?.trim() ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)));

    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus && where.payment === undefined) where.payment = { status: paymentStatus };
    else if (paymentStatus) where.payment.status = paymentStatus;
    if (college) where.college = { contains: college };

    if (q) {
      where.OR = [
        { teamName: { contains: q } },
        { registrationId: { contains: q } },
        { college: { contains: q } },
        { members: { some: { OR: [
          { fullName: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ] } } },
        { payment: { transactionId: { contains: q } } },
      ];
    }

    const [teams, total] = await Promise.all([
      db.team.findMany({
        where,
        select: {
          id: true,
          teamName: true,
          registrationId: true,
          status: true,
          college: true,
          createdAt: true,
          updatedAt: true,
          members: { select: { id: true, fullName: true, email: true, phone: true, participantId: true } },
          payment: { select: { id: true, status: true, transactionId: true, updatedAt: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.team.count({ where }),
    ]);

    return NextResponse.json({
      teams,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return jsonError(err);
  }
}
