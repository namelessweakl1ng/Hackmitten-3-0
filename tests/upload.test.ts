import { describe, expect, it } from "bun:test";
import { UploadError, detectImageMime, validateImageFile } from "@/lib/upload";

const imageCases: Array<[string, number[]]> = [
  ["image/jpeg", [0xff, 0xd8, 0xff, 0x00]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/gif", [0x47, 0x49, 0x46, 0x38]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
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
});
