import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentSubmissionSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api-auth";
import { attemptRegistrationAcknowledgement } from "@/lib/registration-acknowledgement";

/**
 * POST /api/registrations/:id/payment
 * Submit transaction ID. Moves team status from SUBMITTED → PAYMENT_PENDING
 * and creates (or updates) the Payment record.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = paymentSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid transaction ID", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const team = await db.team.findUnique({ where: { id }, include: { payment: true } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    // Only allow from SUBMITTED or PAYMENT_PENDING (resubmission allowed if rejected)
    if (!["SUBMITTED", "PAYMENT_PENDING", "REJECTED"].includes(team.status)) {
      return NextResponse.json(
        { error: `Cannot submit payment from status ${team.status}` },
        { status: 400 },
      );
    }

    const payment = await db.payment.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        transactionId: parsed.data.transactionId,
        status: "PENDING",
        rejectionReason: null,
      },
      update: {
        transactionId: parsed.data.transactionId,
        status: "PENDING",
        rejectionReason: null,
        verifiedById: null,
        verifiedAt: null,
      },
    });

    await db.team.update({
      where: { id: team.id },
      data: { status: "PAYMENT_PENDING" },
    });

    const acknowledgementEmailSent = await attemptRegistrationAcknowledgement(team.id);
    return NextResponse.json({ payment, acknowledgementEmailSent });
  } catch (err) {
    return jsonError(err);
  }
}
