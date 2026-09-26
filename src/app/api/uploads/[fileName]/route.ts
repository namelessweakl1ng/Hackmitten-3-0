import { NextResponse } from "next/server";
import { readPublicUpload } from "@/lib/upload";
const extensionTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await params;
  if (!/^[a-z0-9_-]{1,40}_[a-f0-9]{12}\.(?:jpg|png|webp|gif)$/.test(fileName)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const contents = await readPublicUpload(fileName);
    if (!contents) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const extension = fileName.slice(fileName.lastIndexOf(".") + 1);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": extensionTypes[extension],
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
