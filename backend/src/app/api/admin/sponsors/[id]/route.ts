import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requirePermission } from "@/lib/api-auth";
import { deletePublicFile } from "@/lib/upload";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("sponsor:manage");
    const { id } = await params;
    const sponsor = await db.sponsor.findUnique({ where: { id } });
    if (!sponsor) return NextResponse.json({ error: "Sponsor not found." }, { status: 404 });
    await db.sponsor.delete({ where: { id } });
    // Delete the record first so a storage failure never leaves a broken logo
    // on the public site. Static migrated logos are intentionally ignored.
    await deletePublicFile(sponsor.logoUrl).catch((cleanupError) => {
      console.error("[sponsors] unable to remove deleted sponsor logo", cleanupError);
    });
    return NextResponse.json({ success: true });
  } catch (error) { return jsonError(error); }
}
