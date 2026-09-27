import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { writeAudit } from "@/lib/audit";
import { recordChange, snapshotRow } from "@/lib/change-history";
import { rejectionSchema } from "@/lib/validators";

/**
 * POST /api/admin/payments/:id/reject
 * Body: { reason: string }
 * Marks payment as REJECTED with reason, team status → REJECTED.
 * Records change history for rollback.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("registration:reject");
    const { id } = await params;
    const body = await req.json();
    const parsed = rejectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Reason required", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const payment = await db.payment.findUnique({ where: { id }, include: { team: true } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "VERIFIED") {
      return NextResponse.json({ error: "Cannot reject a verified payment" }, { status: 400 });
    }

    const previousSnapshot = snapshotRow(payment);
    const updated = await db.payment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason,
        verifiedById: ctx.userId,
        verifiedAt: new Date(),
      },
    });

    await db.team.update({
      where: { id: payment.teamId },
      data: { status: "REJECTED" },
    });

    await recordChange({
      section: "PAYMENT",
      entityId: id,
      entityType: "Payment",
      action: "REJECT",
      previousState: previousSnapshot,
      newState: snapshotRow(updated),
      changedById: ctx.userId,
    });

    await writeAudit({
      userId: ctx.userId,
      teamId: payment.teamId,
      action: "PAYMENT_REJECTED",
      detail: parsed.data.reason,
    });

    return NextResponse.json({ payment: updated });
  } catch (err) {
    return jsonError(err);
  }
}
