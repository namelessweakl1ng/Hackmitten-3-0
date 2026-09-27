import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { rejectionSchema } from "@/lib/validators";

/**
 * POST /api/admin/payments/:id/reject
 * Reject payment and team together, after serializing changes for this team.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("registration:reject");
    const { id } = await params;
    const parsed = rejectionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Reason required", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const payment = await db.payment.findUnique({ where: { id }, select: { teamId: true } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.teamId}))`;
      const current = await tx.payment.findUnique({
        where: { id },
        include: { team: { select: { status: true } } },
      });
      if (!current) return { kind: "missing" } as const;
      if (current.status === "VERIFIED") return { kind: "verified" } as const;
      if (current.team.status === "APPROVED") return { kind: "approved" } as const;
      if (current.status !== "PENDING" || current.team.status !== "PAYMENT_PENDING") return { kind: "stale" } as const;

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: parsed.data.reason,
          verifiedById: ctx.userId,
          verifiedAt: new Date(),
        },
      });
      await tx.team.update({
        where: { id: payment.teamId },
        data: { status: "REJECTED" },
      });
      return { kind: "ok", payment: updated } as const;
    });

    if (result.kind === "missing") return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (result.kind === "verified") return NextResponse.json({ error: "Cannot reject a verified payment" }, { status: 400 });
    if (result.kind === "approved") return NextResponse.json({ error: "Approved teams cannot have their payment changed" }, { status: 409 });
    if (result.kind === "stale") return NextResponse.json({ error: "Payment is no longer pending review" }, { status: 409 });
    return NextResponse.json({ payment: result.payment });
  } catch (err) {
    return jsonError(err);
  }
}
