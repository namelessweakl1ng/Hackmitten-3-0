const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function safeBaseName(value: string): string {
  const cleaned = Array.from(
    value
      .normalize("NFC")
      .replace(/[\p{Cc}\p{Cf}\p{Cs}<>:"/\\|?*]/gu, "_")
      .replace(/\s+/g, " ")
      .replace(/^[. ]+|[. ]+$/g, ""),
  ).slice(0, 120).join("").replace(/[. ]+$/g, "");

  if (!cleaned) return "participant";
  return /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i.test(cleaned) ? "_" + cleaned : cleaned;
}

/** A display name, safe as a local filename, with an extension derived from the stored MIME type. */
export function participantImageFilename(fullName: string, mimeType: string | null): string | null {
  const extension = mimeType ? EXTENSIONS[mimeType] : undefined;
  return extension ? safeBaseName(fullName) + "." + extension : null;
}

/** Keep images viewable inline while giving browser downloads a portable name. */
export function participantImageContentDisposition(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const asciiName = safeBaseName(filename.slice(0, dot).normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\x20-\x7e]/g, ""));
  const asciiFilename = asciiName + filename.slice(dot);
  const encodedFilename = encodeURIComponent(filename).replace(/[!'()*]/g, (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase());
  return "inline; filename=\"" + asciiFilename + "\"; filename*=UTF-8''" + encodedFilename;
}
