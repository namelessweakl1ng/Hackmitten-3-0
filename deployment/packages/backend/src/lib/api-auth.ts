import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PermissionError } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export interface AuthContext {
  userId: string;
  role: Role;
  email: string;
  name?: string | null;
}

/** JWT claims must still describe a live account at its current version. */
export function isCurrentSessionUser(
  sessionUser: { id: string; role: Role; sessionVersion: number },
  currentUser: { id: string; role: Role; updatedAt: Date } | null,
): boolean {
  return Boolean(currentUser &&
    currentUser.id === sessionUser.id &&
    currentUser.role === sessionUser.role &&
    currentUser.updatedAt.getTime() === sessionUser.sessionVersion);
}

function authenticationRequired(): PermissionError {
  const error = new PermissionError("Authentication required");
  error.statusCode = 401;
  return error;
}

/** Require a live, unchanged account for every protected API request. */
export async function requireSession(): Promise<AuthContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role || !Number.isSafeInteger(session.user.sessionVersion)) {
    throw authenticationRequired();
  }
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true, name: true, updatedAt: true },
  });
  if (!currentUser || !isCurrentSessionUser(session.user, currentUser)) {
    throw authenticationRequired();
  }
  return {
    userId: currentUser.id,
    role: currentUser.role,
    email: currentUser.email,
    name: currentUser.name,
  };
}

/**
 * Require an authenticated session AND a specific permission.
 */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await requireSession();
  if (!can(ctx.role, permission)) {
    throw new PermissionError(`Forbidden: missing permission ${permission}`);
  }
  return ctx;
}

/** Helper for API routes — converts thrown PermissionError into JSON response. */
export function jsonError(err: unknown): Response {
  if (err instanceof PermissionError) {
    return Response.json(
      { error: err.statusCode === 401 ? "Authentication required" : "Forbidden", code: err.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN" },
      { status: err.statusCode },
    );
  }
  console.error("[api] unhandled error", {
    name: err instanceof Error ? err.name : "UnknownError",
  });
  return Response.json({ error: "An unexpected error occurred.", code: "INTERNAL" }, { status: 500 });
}
