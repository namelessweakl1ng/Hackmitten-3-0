import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requirePermission } from "@/lib/api-auth";
import { deletePublicFile, storeImage, UploadError } from "@/lib/upload";

const TIERS = new Set(["TITLE", "PARTNER", "CUSTOM"]);

export async function GET() {
  try {
    await requirePermission("sponsor:manage");
    const sponsors = await db.sponsor.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return NextResponse.json({ sponsors });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    await requirePermission("sponsor:manage");
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const websiteUrl = String(form.get("websiteUrl") ?? "").trim();
    const tier = String(form.get("tier") ?? "PARTNER");
    const customTier = String(form.get("customTier") ?? "").trim();
    const logo = form.get("logo");
    if (!name || name.length > 120) return NextResponse.json({ error: "Sponsor name is required (maximum 120 characters)." }, { status: 400 });
    if (!TIERS.has(tier)) return NextResponse.json({ error: "Invalid sponsor tier." }, { status: 400 });
    if (!(logo instanceof File)) return NextResponse.json({ error: "A logo image is required." }, { status: 400 });
    let normalizedWebsite: string | null = null;
    if (websiteUrl) {
      try {
        const url = new URL(websiteUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
        normalizedWebsite = url.toString();
      } catch { return NextResponse.json({ error: "Website URL must be a valid HTTP or HTTPS URL." }, { status: 400 }); }
    }
    const stored = await storeImage({ file: logo, prefix: "sponsor" });
    try {
      const sponsor = await db.$transaction(async (tx) => {
        // Serialize the small max-plus-one section so simultaneous uploads
        // cannot receive the same position.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('sponsor-sort-order'))`;
        const next = await tx.sponsor.aggregate({ _max: { sortOrder: true } });
        return tx.sponsor.create({ data: {
          name, websiteUrl: normalizedWebsite, tier,
          customTier: tier === "CUSTOM" ? customTier || null : null,
          logoUrl: stored.relativePath, sortOrder: (next._max.sortOrder ?? -1) + 1,
        } });
      });
      return NextResponse.json({ sponsor }, { status: 201 });
    } catch (error) {
      // Preserve the database error even if best-effort orphan cleanup fails.
      await deletePublicFile(stored.relativePath).catch((cleanupError) => {
        console.error("[sponsors] unable to clean up logo after failed create", cleanupError);
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return jsonError(error);
  }
}
