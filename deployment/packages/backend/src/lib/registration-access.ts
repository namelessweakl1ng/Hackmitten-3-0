import { createHash, randomBytes } from "node:crypto";

const TOKEN_COOKIE_PREFIX = "hm3_registration_";

export function createRegistrationAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRegistrationAccessToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function registrationAccessCookieName(teamId: string): string | null {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(teamId)) return null;
  return `${TOKEN_COOKIE_PREFIX}${teamId}`;
}

export function registrationAccessTokenFromRequest(request: Request, teamId: string): string | null {
  const cookieName = registrationAccessCookieName(teamId);
  if (!cookieName) return null;
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== cookieName) continue;
    const value = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }
  return null;
}

export async function hasRegistrationAccess(
  request: Request,
  teamId: string,
  database: {
    team: { findFirst(args: { where: { id: string; registrationAccessTokenHash: string; registrationAccessExpiresAt: { gt: Date } } }): Promise<{ id: string } | null> };
  },
): Promise<boolean> {
  const token = registrationAccessTokenFromRequest(request, teamId);
  if (!token) return false;
  const registrationAccessTokenHash = hashRegistrationAccessToken(token);
  const team = await database.team.findFirst({
    where: { id: teamId, registrationAccessTokenHash, registrationAccessExpiresAt: { gt: new Date() } },
  });
  return Boolean(team);
}

export const REGISTRATION_ACCESS_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;
