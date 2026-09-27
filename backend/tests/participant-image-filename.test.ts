import { describe, expect, it } from "bun:test";
import { participantImageContentDisposition, participantImageFilename } from "@/lib/participant-image-filename";

describe("participant image filenames", () => {
  it.each([
    ["John Doe", "image/jpeg", "John Doe.jpg"],
    ["Jane_Smith", "image/png", "Jane_Smith.png"],
    ["Amélie 王", "image/webp", "Amélie 王.webp"],
  ])("preserves the name and MIME extension for %s", (name, mime, expected) => {
    expect(participantImageFilename(name, mime)).toBe(expected);
  });

  it("removes filename metacharacters, controls and reserved device names", () => {
    expect(participantImageFilename("  ../Jo:hn\\Doe?\r\n  ", "image/jpeg")).toBe("_Jo_hn_Doe___.jpg");
    expect(participantImageFilename("CON", "image/png")).toBe("_CON.png");
    expect(participantImageFilename("NUL.txt", "image/png")).toBe("_NUL.txt.png");
    expect(participantImageFilename(" / ", "image/webp")).toBe("_.webp");
    expect(participantImageFilename("", "image/jpeg")).toBe("participant.jpg");
    expect(participantImageFilename("A\uD800B", "image/jpeg")).toBe("A_B.jpg");
  });

  it("rejects unsupported and absent MIME types", () => {
    expect(participantImageFilename("Jane", "image/gif")).toBeNull();
    expect(participantImageFilename("Jane", null)).toBeNull();
  });

  it("provides an ASCII fallback and an encoded UTF-8 filename for inline display", () => {
    expect(participantImageContentDisposition("Amélie 王.webp"))
      .toBe("inline; filename=\"Amelie.webp\"; filename*=UTF-8''Am%C3%A9lie%20%E7%8E%8B.webp");
    expect(participantImageContentDisposition("John Doe.jpg"))
      .toBe("inline; filename=\"John Doe.jpg\"; filename*=UTF-8''John%20Doe.jpg");
  });
});
