import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";

/**
 * POST /api/admin/payments/:id/verify
 * Verify payment and advance the team together, after serializing changes for this team.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("registration:verify");
    const { id } = await params;
    const payment = await db.payment.findUnique({ where: { id }, select: { teamId: true } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.teamId}))`;
      const current = await tx.payment.findUnique({
        where: { id },
        include: { team: { select: { status: true } }, _count: { select: { screenshots: true } } },
      });
      if (!current) return { kind: "missing" } as const;
      if (current.status === "VERIFIED") return { kind: "verified" } as const;
      if (current.team.status === "APPROVED") return { kind: "approved" } as const;
      if (current.status !== "PENDING" || current.team.status !== "PAYMENT_PENDING") return { kind: "stale" } as const;
      if (current._count.screenshots === 0) return { kind: "noProof" } as const;

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: "VERIFIED",
          verifiedById: ctx.userId,
          verifiedAt: new Date(),
          rejectionReason: null,
        },
      });
      await tx.team.update({
        where: { id: payment.teamId },
        data: { status: "PAYMENT_VERIFIED" },
      });
      return { kind: "ok", payment: updated } as const;
    });

    if (result.kind === "missing") return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (result.kind === "verified") return NextResponse.json({ error: "Already verified" }, { status: 400 });
    if (result.kind === "approved") return NextResponse.json({ error: "Approved teams cannot have their payment changed" }, { status: 409 });
    if (result.kind === "stale") return NextResponse.json({ error: "Payment is no longer pending review" }, { status: 409 });
    if (result.kind === "noProof") return NextResponse.json({ error: "Payment proof is required before verification" }, { status: 400 });
    return NextResponse.json({ payment: result.payment });
  } catch (err) {
    return jsonError(err);
  }
}
