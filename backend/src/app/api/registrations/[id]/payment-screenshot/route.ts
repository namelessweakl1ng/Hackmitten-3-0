import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deletePrivateFile, storePaymentScreenshot, UploadError } from "@/lib/upload";
import { jsonError } from "@/lib/api-auth";
import { hasRegistrationAccess } from "@/lib/registration-access";

/** Upload the current proof for a pending registration payment. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 9 * 1024 * 1024) {
      return NextResponse.json({ error: "Upload exceeds the request size limit." }, { status: 413 });
    }
    const { id } = await params;
    if (!(await hasRegistrationAccess(req, id, db))) {
      return NextResponse.json({ error: "Registration access denied", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const current = await db.team.findUnique({
      where: { id },
      select: { status: true, payment: { select: { id: true, status: true, transactionId: true, updatedAt: true } } },
    });
    if (!current) return NextResponse.json({ error: "Registration access denied", code: "UNAUTHORIZED" }, { status: 401 });
    const payment = current.payment;
    if (!payment) {
      return NextResponse.json({ error: "Submit transaction ID first" }, { status: 400 });
    }
    if (current.status !== "PAYMENT_PENDING" || payment.status !== "PENDING") {
      return NextResponse.json({ error: "This payment no longer accepts screenshots" }, { status: 409 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const stored = await storePaymentScreenshot({ file, paymentId: payment.id });
    let result;
    try {
      result = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
        const team = await tx.team.findUnique({
          where: { id },
          select: { status: true, payment: { select: { id: true, status: true, transactionId: true, updatedAt: true } } },
        });
        if (!team || team.status !== "PAYMENT_PENDING" || team.payment?.status !== "PENDING") {
          return { error: "This payment no longer accepts screenshots", status: 409 } as const;
        }
        if (team.payment.id !== payment.id ||
            team.payment.transactionId !== payment.transactionId ||
            team.payment.updatedAt.getTime() !== payment.updatedAt.getTime()) {
          return { error: "Payment changed during upload. Please retry the screenshot.", status: 409 } as const;
        }
        // A replacement should become the one proof the admin sees. Keeping
        // earlier uploads here could display a receipt for another attempt.
        const previous = await tx.paymentScreenshot.findMany({
          where: { paymentId: team.payment.id },
          select: { filePath: true },
        });
        await tx.paymentScreenshot.deleteMany({ where: { paymentId: team.payment.id } });
        const screenshot = await tx.paymentScreenshot.create({
          data: {
            paymentId: team.payment.id,
            filePath: stored.relativePath,
            fileName: stored.fileName,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
          },
          select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
        });
        return { screenshot, oldFilePaths: previous.map((item) => item.filePath) } as const;
      });
    } catch (error) {
      await Promise.allSettled([deletePrivateFile(stored.relativePath)]);
      throw error;
    }
    if ("error" in result) {
      await Promise.allSettled([deletePrivateFile(stored.relativePath)]);
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    await Promise.allSettled(result.oldFilePaths.map(deletePrivateFile));
    return NextResponse.json({ screenshot: result.screenshot }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return jsonError(err);
  }
}
