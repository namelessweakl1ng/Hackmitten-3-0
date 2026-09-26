import { describe, expect, it } from "bun:test";
import sharp from "sharp";
import { MAX_PARTICIPANT_IMAGE_SIZE, UploadError, detectImageMime, validateImageFile } from "@/lib/upload";

const imageCases: Array<[string, number[]]> = [
  ["image/jpeg", [...await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).jpeg().toBuffer()]],
  ["image/png", [...await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer()]],
  ["image/gif", [...Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64")]],
  ["image/webp", [...await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).webp().toBuffer()]],
];

describe("image upload validation", () => {
  it.each(imageCases)("accepts recognized %s bytes when the MIME matches", async (mime, bytes) => {
    expect(await validateImageFile(new File([new Uint8Array(bytes)], "image.bin", { type: mime }))).toBe(mime);
  });

  it("rejects text or executable bytes even if the client claims an image MIME", async () => {
    const file = new File(["MZ not an image"], "image.png", { type: "image/png" });
    await expect(validateImageFile(file)).rejects.toBeInstanceOf(UploadError);
  });

  it("rejects a MIME mismatch", async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "image.jpg", { type: "image/jpeg" });
    await expect(validateImageFile(file)).rejects.toThrow("does not match");
  });

  it("rejects empty and oversized files", async () => {
    await expect(validateImageFile(new File([], "empty.png", { type: "image/png" }))).rejects.toThrow("empty");
    const tooLarge = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    await expect(validateImageFile(tooLarge)).rejects.toThrow("too large");
  });

  it("does not identify arbitrary data as an image", () => {
    expect(detectImageMime(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });

  it.each(imageCases.filter(([mime]) => mime !== "image/gif"))("accepts a valid participant %s image below 500 KB", async (mime, bytes) => {
    const file = new File([new Uint8Array(bytes)], "photo.jpg", { type: mime });
    expect(await validateImageFile(file, { maxSize: MAX_PARTICIPANT_IMAGE_SIZE, allowedMime: new Set(["image/jpeg", "image/png", "image/webp"]) })).toBe(mime);
  });

  it("rejects a truncated image after matching the magic bytes", async () => {
    await expect(validateImageFile(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], "broken.png", { type: "image/png" }))).rejects.toThrow("malformed");
  });

  it("accepts a valid participant JPEG at exactly 512000 bytes and rejects 512001 bytes", async () => {
    const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).jpeg().toBuffer();
    const padding = MAX_PARTICIPANT_IMAGE_SIZE - jpeg.byteLength;
    const comments: Buffer[] = [];
    let remaining = padding;
    while (remaining > 65_537) {
      comments.push(Buffer.concat([Buffer.from([0xff, 0xfe, 0xff, 0xff]), Buffer.alloc(65_533, 0x41)]));
      remaining -= 65_537;
    }
    if (remaining > 0) {
      const payloadLength = remaining - 4;
      const lengthField = payloadLength + 2;
      comments.push(Buffer.concat([Buffer.from([0xff, 0xfe, lengthField >> 8, lengthField & 0xff]), Buffer.alloc(payloadLength, 0x41)]));
    }
    const exact = Buffer.concat([jpeg.subarray(0, jpeg.length - 2), ...comments, jpeg.subarray(jpeg.length - 2)]);
    expect(exact.byteLength).toBe(MAX_PARTICIPANT_IMAGE_SIZE);
    const accepted = new File([exact], "../../malicious-name.jpg", { type: "image/jpeg" });
    expect(await validateImageFile(accepted, { maxSize: MAX_PARTICIPANT_IMAGE_SIZE, allowedMime: new Set(["image/jpeg", "image/png", "image/webp"]) })).toBe("image/jpeg");
    const oversized = new File([Buffer.concat([exact, Buffer.from([0])])], "renamed.exe", { type: "image/jpeg" });
    await expect(validateImageFile(oversized, { maxSize: MAX_PARTICIPANT_IMAGE_SIZE, allowedMime: new Set(["image/jpeg", "image/png", "image/webp"]) })).rejects.toThrow("too large");
  });

  it("rejects GIF as a participant image and rejects private path traversal keys", async () => {
    const gif = new File([Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64")], "photo.gif", { type: "image/gif" });
    await expect(validateImageFile(gif, { maxSize: MAX_PARTICIPANT_IMAGE_SIZE, allowedMime: new Set(["image/jpeg", "image/png", "image/webp"]) })).rejects.toThrow("supported image");
    const { readPrivateFile } = await import("@/lib/upload");
    await expect(readPrivateFile("private://../../etc/passwd")).resolves.toBeNull();
  });

  it("rejects an otherwise valid image with polyglot-style trailing data", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    const file = new File([Buffer.concat([png, Buffer.from("<script>alert(1)</script>")])], "image.png", { type: "image/png" });
    await expect(validateImageFile(file)).rejects.toThrow("trailing data");
  });
});
