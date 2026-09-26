import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deletePrivateFile, storePaymentScreenshot, UploadError } from "@/lib/upload";
import { jsonError } from "@/lib/api-auth";

/**
 * POST /api/registrations/:id/payment-screenshot
 * Multipart form: field `file` (image/jpeg, png, webp, gif; max 8MB).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 9 * 1024 * 1024) {
      return NextResponse.json({ error: "Upload exceeds the request size limit." }, { status: 413 });
    }
    const { id } = await params;
    const team = await db.team.findUnique({ where: { id }, include: { payment: true } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    if (!team.payment) {
      return NextResponse.json(
        { error: "Submit transaction ID first" },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const stored = await storePaymentScreenshot({ file, paymentId: team.payment.id });
    let screenshot;
    try {
      screenshot = await db.paymentScreenshot.create({
        data: {
          paymentId: team.payment.id,
          filePath: stored.relativePath,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
        },
      });
    } catch (error) {
      await deletePrivateFile(stored.relativePath);
      throw error;
    }
    return NextResponse.json({ screenshot }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return jsonError(err);
  }
}
