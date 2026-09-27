import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

/**
 * Require an authenticated session. Returns the user context.
 * Throws PermissionError(401) if not authenticated.
 */
export async function requireSession(): Promise<AuthContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    const err = new PermissionError("Authentication required") as any;
    err.statusCode = 401;
    throw err;
  }
  return {
    userId: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
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
