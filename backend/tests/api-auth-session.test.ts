import { describe, expect, it } from "bun:test";
import { isCurrentSessionUser } from "@/lib/api-auth";

const updatedAt = new Date("2026-09-27T12:00:00.000Z");
const account = { id: "user-1", role: "COORDINATOR" as const, updatedAt };
const session = { id: account.id, role: account.role, sessionVersion: updatedAt.getTime() };

describe("protected API session identity", () => {
  it("accepts a session for the current account version", () => {
    expect(isCurrentSessionUser(session, account)).toBe(true);
  });

  it("revokes a deleted or demoted account", () => {
    expect(isCurrentSessionUser(session, null)).toBe(false);
    expect(isCurrentSessionUser(session, { ...account, role: "PARTICIPANT" })).toBe(false);
  });

  it("revokes sessions after a credential or account update", () => {
    expect(isCurrentSessionUser(session, { ...account, updatedAt: new Date(updatedAt.getTime() + 1) })).toBe(false);
    expect(isCurrentSessionUser({ ...session, sessionVersion: NaN }, account)).toBe(false);
  });
});
