import path from "node:path";
import { randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { detectImageMime, validateImageFile } from "@/lib/upload";

const sourceRoot = process.env.LEGACY_SCREENSHOT_EXPORT_DIR;
const storageRoot = process.env.HACKMITTEN_STORAGE_ROOT;
if (!sourceRoot || !storageRoot) {
  throw new Error("Set LEGACY_SCREENSHOT_EXPORT_DIR and HACKMITTEN_STORAGE_ROOT before running this import.");
}

const sourceBase = path.resolve(sourceRoot);
const privateRoot = path.resolve(storageRoot, "private");
await mkdir(privateRoot, { recursive: true, mode: 0o700 });
await chmod(privateRoot, 0o700);
const realSourceBase = await realpath(sourceBase);

const rows = await db.paymentScreenshot.findMany({
  where: { filePath: { startsWith: "supabase://payment-screenshots/" } },
  orderBy: { id: "asc" },
});
let imported = 0;

for (const row of rows) {
  const key = row.filePath.slice("supabase://payment-screenshots/".length);
  const sourcePath = path.resolve(sourceBase, ...key.split(/[\\/]/));
  const relative = path.relative(sourceBase, sourcePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Unsafe source key for screenshot ${row.id}`);
  const metadata = await lstat(sourcePath);
  const realSourcePath = await realpath(sourcePath);
  const realRelative = path.relative(realSourceBase, realSourcePath);
  if (!metadata.isFile() || metadata.isSymbolicLink() || realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    throw new Error(`Unsafe source file for screenshot ${row.id}`);
  }
  if (metadata.size > 8 * 1024 * 1024) throw new Error(`Screenshot ${row.id} exceeds 8 MiB`);
  const bytes = await readFile(sourcePath);
  const mime = detectImageMime(bytes.subarray(0, 12));
  if (bytes.byteLength > 8 * 1024 * 1024 || mime !== row.mimeType) {
    throw new Error(`Image size/type mismatch for screenshot ${row.id}; no database update was made for that row.`);
  }
  await validateImageFile(new File([bytes], "legacy-image", { type: mime }));
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : null;
  if (!extension) throw new Error(`Unsupported image for screenshot ${row.id}`);

  const fileName = `legacy_${randomUUID().replaceAll("-", "").slice(0, 12)}.${extension}`;
  const destination = path.join(privateRoot, fileName);
  await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
  try {
    await db.paymentScreenshot.update({
      where: { id: row.id },
      data: { filePath: `private://${fileName}`, fileName, mimeType: mime, sizeBytes: bytes.byteLength },
    });
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
  imported++;
}

console.log(`Imported ${imported} payment screenshots to local private storage.`);
await db.$disconnect();
