import path from "node:path";
import { promises as fs } from "node:fs";

const UPLOAD_ROOT = path.resolve(process.env.HM3_PUBLIC_UPLOAD_DIR || path.join(process.cwd(), "storage", "public"));
const PRIVATE_UPLOAD_ROOT = path.resolve(process.env.HM3_PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "storage", "private"));
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 8 * 1024 * 1024;

function supabaseStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export class UploadError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export interface StoredFile {
  relativePath: string;
  absolutePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isPrivate: boolean;
}

function safeName(prefix: string, mime: string): string {
  const ext = guessExtension(mime);
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 40) || "upload";
  return `${safePrefix}_${random}.${ext}`;
}

function guessExtension(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    default: return "bin";
  }
}

export function detectImageMime(head: Uint8Array): string | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return "image/png";
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return "image/gif";
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function validateImageFile(file: File): Promise<string> {
  if (!file || file.size === 0) throw new UploadError("The selected image is empty.");
  if (file.size > MAX_SIZE) throw new UploadError(`File too large (max ${Math.floor(MAX_SIZE / 1024 / 1024)}MB)`);
  const detected = detectImageMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!detected || !ALLOWED_MIME.has(detected)) {
    throw new UploadError("File content is not a supported image.");
  }
  if (file.type !== detected) {
    throw new UploadError("File content does not match the declared image type.");
  }
  return detected;
}

export async function storeImage(opts: {
  file: File;
  prefix: string;
}): Promise<StoredFile> {
  const { file, prefix } = opts;
  return storeFileInternal(file, prefix, false);
}

export async function storePaymentScreenshot(opts: {
  file: File;
  paymentId: string;
}): Promise<StoredFile> {
  const { file, paymentId } = opts;
  return storeFileInternal(file, `pay_${paymentId}`, true);
}

async function storeFileInternal(
  file: File,
  prefix: string,
  isPrivate: boolean,
): Promise<StoredFile> {
  const effectiveMime = await validateImageFile(file);
  const fileName = safeName(prefix, effectiveMime);

  if (isPrivate) {
    return saveToLocal(file, fileName, true, effectiveMime);
  }

  return saveToLocal(file, fileName, false, effectiveMime);
}

/**
 * Stream a private payment screenshot from Supabase Storage.
 * The bucket is private and this function uses the server-only Supabase client.
 */
export async function getPrivateSupabaseStream(filePath: string): Promise<{
  stream: ReadableStream<Uint8Array>;
  contentType: string;
} | null> {
  const prefix = "supabase://payment-screenshots/";

  if (!filePath.startsWith(prefix) || !supabaseStorageConfigured()) {
    return null;
  }

  const storagePath = filePath.slice(prefix.length);

  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin");

    const { data, error } = await supabaseAdmin.storage
      .from("payment-screenshots")
      .download(storagePath);

    if (error || !data) {
      return null;
    }

    return {
      stream: data.stream() as ReadableStream<Uint8Array>,
      contentType: data.type || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

async function saveToLocal(
  file: File,
  fileName: string,
  isPrivate: boolean,
  mimeType: string,
): Promise<StoredFile> {
  if (isPrivate) {
    await fs.mkdir(PRIVATE_UPLOAD_ROOT, { recursive: true });

    const abs = path.join(PRIVATE_UPLOAD_ROOT, fileName);
    const buf = await file.arrayBuffer();

    await fs.writeFile(abs, Buffer.from(buf));

    return {
      relativePath: `private://${fileName}`,
      absolutePath: abs,
      fileName,
      mimeType,
      sizeBytes: file.size,
      isPrivate,
    };
  }

  await fs.mkdir(UPLOAD_ROOT, { recursive: true });

  const abs = path.join(UPLOAD_ROOT, fileName);
  const buf = await file.arrayBuffer();

  await fs.writeFile(abs, Buffer.from(buf));

  return {
    relativePath: `/api/uploads/${fileName}`,
    absolutePath: abs,
    fileName,
    mimeType,
    sizeBytes: file.size,
    isPrivate,
  };
}

/**
 * Read a private payment screenshot from the local dev filesystem
 * (stored in .private-uploads/, NOT under public/).
 */
export async function readLocalPrivateFile(relativePath: string): Promise<{
  data: Buffer;
  contentType: string;
} | null> {
  if (!relativePath.startsWith("private://")) {
    return null;
  }

  const fileName = relativePath.slice("private://".length);
  if (!/^[a-z0-9_-]+_[a-f0-9]{12}\.(?:jpg|png|webp|gif)$/.test(fileName)) return null;
  const abs = path.join(PRIVATE_UPLOAD_ROOT, fileName);

  try {
    let data: Buffer;
    try {
      data = await fs.readFile(abs);
    } catch {
      // Read the former local directory for files uploaded before storage was centralized.
      data = await fs.readFile(path.join(process.cwd(), ".private-uploads", fileName));
    }
    const ext = path.extname(fileName).toLowerCase();

    const contentType =
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".png" ? "image/png" :
      ext === ".webp" ? "image/webp" :
      ext === ".gif" ? "image/gif" :
      "application/octet-stream";

    return { data, contentType };
  } catch {
    return null;
  }
}
