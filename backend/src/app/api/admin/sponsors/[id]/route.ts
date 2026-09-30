import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requirePermission } from "@/lib/api-auth";
import { deletePublicFile } from "@/lib/upload";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("sponsor:manage");
    const { id } = await params;
    const sponsor = await db.sponsor.delete({ where: { id } });
    await deletePublicFile(sponsor.logoUrl).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (error) { return jsonError(error); }
}
