import { describe, expect, it } from "bun:test";
import { generateQrToken, nextRegistrationSequence } from "@/lib/constants";

describe("QR pass credentials", () => {
  it("generates opaque 192-bit hexadecimal tokens without participant data", () => {
    const token = generateQrToken();
    expect(token).toMatch(/^[a-f0-9]{48}$/);
    expect(generateQrToken()).not.toBe(token);
  });

  it("allocates above the highest surviving registration ID, even after deletions", () => {
    expect(nextRegistrationSequence(["HM3-00481", "HM3-00510", null])).toBe(511);
    expect(nextRegistrationSequence([])).toBe(481);
  });
});
