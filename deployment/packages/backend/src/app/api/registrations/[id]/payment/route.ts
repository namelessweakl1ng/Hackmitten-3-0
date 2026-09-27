import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentSubmissionSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api-auth";
import { attemptRegistrationAcknowledgement } from "@/lib/registration-acknowledgement";
import { hasRegistrationAccess } from "@/lib/registration-access";
import { deletePrivateFile } from "@/lib/upload";
import { paymentSubmissionBlockReason, shouldResetPaymentProof } from "@/lib/registration-payment-state";

/** Submit or resubmit a transaction ID while this registration can still be paid. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await hasRegistrationAccess(req, id, db))) {
      return NextResponse.json({ error: "Registration access denied", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const parsed = paymentSubmissionSchema.safeParse(await req.json());
    if (!parsed.success || parsed.data.transactionId.trim().length < 4) {
      return NextResponse.json(
        { error: "Invalid transaction ID", ...(parsed.success ? {} : { issues: parsed.error.issues }) },
        { status: 400 },
      );
    }
    const transactionId = parsed.data.transactionId.trim();

    const result = await db.$transaction(async (tx) => {
      // The screenshot route and admin verification use this same lock. State
      // checks and writes therefore refer to one payment submission at a time.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const team = await tx.team.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          payment: {
            select: {
              id: true,
              status: true,
              transactionId: true,
              screenshots: { select: { filePath: true } },
            },
          },
        },
      });
      if (!team) return { error: "Registration access denied", code: "UNAUTHORIZED", status: 401 } as const;
      const blocked = paymentSubmissionBlockReason(team.status, team.payment?.status ?? null);
      if (blocked) return { error: blocked, status: 409 } as const;

      const replaceProof = shouldResetPaymentProof(team.payment, transactionId);
      const oldFilePaths = replaceProof ? team.payment!.screenshots.map((screenshot) => screenshot.filePath) : [];
      const transition = await tx.team.updateMany({
        where: { id, status: team.status },
        data: { status: "PAYMENT_PENDING" },
      });
      if (transition.count !== 1) {
        return { error: "Registration status changed. Please retry.", status: 409 } as const;
      }
      if (replaceProof) {
        await tx.paymentScreenshot.deleteMany({ where: { paymentId: team.payment!.id } });
      }
      const payment = team.payment
        ? await tx.payment.update({
            where: { id: team.payment.id },
            data: {
              transactionId,
              status: "PENDING",
              rejectionReason: null,
              verifiedById: null,
              verifiedAt: null,
            },
            select: { id: true, status: true, transactionId: true },
          })
        : await tx.payment.create({
            data: { teamId: id, transactionId, status: "PENDING" },
            select: { id: true, status: true, transactionId: true },
          });
      return { payment, oldFilePaths } as const;
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error, ...(result.code ? { code: result.code } : {}) }, { status: result.status });
    }

    // The database no longer references old proof. File removal is best effort
    // so a filesystem cleanup failure cannot undo a successful resubmission.
    await Promise.allSettled(result.oldFilePaths.map(deletePrivateFile));
    const acknowledgementEmailSent = await attemptRegistrationAcknowledgement(id);
    return NextResponse.json({ payment: result.payment, acknowledgementEmailSent });
  } catch (err) {
    return jsonError(err);
  }
}
