import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { readPrivateFile } from "@/lib/upload";

/**
 * GET /api/admin/payments/:id/screenshot
 *
 * Streams a private payment screenshot to authorized admin/coordinator users.
 * Payment screenshots are NEVER publicly accessible — no raw URL is ever returned.
 *
 * Authorization: requires "registration:view" permission (SUPER_ADMIN or COORDINATOR).
 * Returns: image bytes with proper Content-Type and Cache-Control: no-store.
 *
 * Security:
 *   - Unauthenticated → 401
 *   - Wrong role → 403
 *   - No screenshot → 404
 *   - Never returns a raw private storage URL or local file path
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("registration:view");
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: { screenshots: true },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.screenshots.length === 0) {
      return NextResponse.json({ error: "No screenshot" }, { status: 404 });
    }

    const screenshot = payment.screenshots[0];
    const filePath = screenshot.filePath;

    // Private files are read only from the configured persistent storage root.
    if (filePath.startsWith("private://")) {
      const result = await readPrivateFile(filePath);
      if (!result) {
        return NextResponse.json({ error: "Screenshot file not found" }, { status: 404 });
      }
      return new Response(new Uint8Array(result.data), {
        headers: {
          "Content-Type": result.contentType,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Path C: Legacy/old public upload — do NOT serve directly, return 404 for safety
    // Old screenshots uploaded before the privacy fix may have public paths.
    // They should be re-uploaded. Never expose the raw URL.
    return NextResponse.json({ error: "Screenshot format unsupported — re-upload required" }, { status: 404 });
  } catch (err) {
    return jsonError(err);
  }
}
