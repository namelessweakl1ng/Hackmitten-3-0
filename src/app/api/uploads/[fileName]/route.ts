import path from "node:path";
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";

const uploadRoot = path.resolve(
  process.env.HM3_PUBLIC_UPLOAD_DIR || path.join(process.cwd(), "storage", "public"),
);
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
    const filePath = path.join(uploadRoot, fileName);
    const contents = await fs.readFile(filePath);
    const extension = path.extname(fileName).slice(1);
    return new Response(contents, {
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
