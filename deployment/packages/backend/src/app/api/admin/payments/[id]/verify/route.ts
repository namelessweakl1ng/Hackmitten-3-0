import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { writeAudit } from "@/lib/audit";
import { recordChange, snapshotRow } from "@/lib/change-history";

/**
 * POST /api/admin/payments/:id/verify
 * Marks the payment as VERIFIED. Sets verifiedBy/at.
 * Team status moves to PAYMENT_VERIFIED.
 * Records change history for rollback.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("registration:verify");
    const { id } = await params;
    const payment = await db.payment.findUnique({ where: { id }, include: { team: true } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "VERIFIED") {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }

    const previousSnapshot = snapshotRow(payment);
    const updated = await db.payment.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedById: ctx.userId,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    // Only allow forward transition from PENDING/REJECTED to PAYMENT_VERIFIED
    if (["PAYMENT_PENDING", "REJECTED", "PAYMENT_VERIFIED"].includes(payment.team.status)) {
      await db.team.update({
        where: { id: payment.teamId },
        data: { status: "PAYMENT_VERIFIED" },
      });
    }

    await recordChange({
      section: "PAYMENT",
      entityId: id,
      entityType: "Payment",
      action: "VERIFY",
      previousState: previousSnapshot,
      newState: snapshotRow(updated),
      changedById: ctx.userId,
    });

    await writeAudit({
      userId: ctx.userId,
      teamId: payment.teamId,
      action: "PAYMENT_VERIFIED",
      detail: `Txn ${payment.transactionId ?? "(none)"}`,
    });

    return NextResponse.json({ payment: updated });
  } catch (err) {
    return jsonError(err);
  }
}
