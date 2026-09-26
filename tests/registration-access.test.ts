import { describe, expect, test } from "bun:test";
import {
  createRegistrationAccessToken,
  hashRegistrationAccessToken,
  hasRegistrationAccess,
  registrationAccessCookieName,
  registrationAccessTokenFromRequest,
} from "@/lib/registration-access";

describe("registration payment access capability", () => {
  test("creates high-entropy opaque tokens and stores only a stable digest", () => {
    const first = createRegistrationAccessToken();
    const second = createRegistrationAccessToken();
    expect(first).toHaveLength(43);
    expect(first).not.toBe(second);
    expect(hashRegistrationAccessToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRegistrationAccessToken(first)).not.toBe(first);
  });

  test("binds cookies to one safe team ID", () => {
    expect(registrationAccessCookieName("cm123abc_456-def")).toBe("hm3_registration_cm123abc_456-def");
    expect(registrationAccessCookieName("../../other-team")).toBeNull();
    expect(registrationAccessCookieName("x".repeat(65))).toBeNull();
  });

  test("reads only a correctly scoped opaque cookie value", () => {
    const teamId = "cm123abc";
    const name = registrationAccessCookieName(teamId)!;
    const token = createRegistrationAccessToken();
    const request = new Request("https://example.test/api/registrations", {
      headers: { cookie: `other=value; ${name}=${token}; trailing=value` },
    });
    expect(registrationAccessTokenFromRequest(request, teamId)).toBe(token);
    expect(registrationAccessTokenFromRequest(request, "different-team")).toBeNull();
    const malformed = new Request("https://example.test", { headers: { cookie: `${name}=short` } });
    expect(registrationAccessTokenFromRequest(malformed, teamId)).toBeNull();
  });

  test("requires matching team, token digest, and unexpired capability", async () => {
    const teamId = "cm123abc";
    const token = createRegistrationAccessToken();
    const request = new Request("https://example.test", {
      headers: { cookie: `${registrationAccessCookieName(teamId)}=${token}` },
    });
    let query: unknown;
    const database = {
      team: {
        async findFirst(args: { where: unknown }) {
          query = args.where;
          return { id: teamId };
        },
      },
    };

    expect(await hasRegistrationAccess(request, teamId, database)).toBe(true);
    expect(query).toEqual({
      id: teamId,
      registrationAccessTokenHash: hashRegistrationAccessToken(token),
      registrationAccessExpiresAt: { gt: expect.any(Date) },
    });
    expect(await hasRegistrationAccess(new Request("https://example.test"), teamId, database)).toBe(false);
  });
});
