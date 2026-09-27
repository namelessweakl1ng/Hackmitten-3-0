import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { PaymentStatus, RegistrationStatus, type Prisma } from "@prisma/client";

/**
 * GET /api/admin/registrations
 * Query params: q (search), status, paymentStatus, college, page, pageSize
 */
export async function GET(req: Request) {
  try {
    await requirePermission("registration:view");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim().slice(0, 150) ?? "";
    const status = url.searchParams.get("status");
    const paymentStatus = url.searchParams.get("paymentStatus");
    const college = url.searchParams.get("college")?.trim().slice(0, 150) ?? "";
    if (status && !Object.values(RegistrationStatus).includes(status as RegistrationStatus)) {
      return NextResponse.json({ error: "Invalid registration status" }, { status: 400 });
    }
    if (paymentStatus && !Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    const positiveInt = (value: string | null, fallback: number, max: number) => {
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback;
    };
    const page = positiveInt(url.searchParams.get("page"), 1, 1_000_000);
    const pageSize = positiveInt(url.searchParams.get("pageSize"), 20, 100);

    const where: Prisma.TeamWhereInput = {};
    if (status) where.status = status as RegistrationStatus;
    if (paymentStatus) where.payment = { status: paymentStatus as PaymentStatus };
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
