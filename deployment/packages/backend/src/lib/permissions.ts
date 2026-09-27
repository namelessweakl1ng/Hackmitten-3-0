import { Role } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "registration:view"
  | "registration:verify"
  | "registration:reject"
  | "team:approve"
  | "team:reject"
  | "participant:view"
  | "food:scan"
  | "food:view"
  | "food:manage"
  | "config:edit"
  | "phase:manage"
  | "coordinator:manage"
  | "user:manage"
  | "credential:change"
  | "export:data"
  | "audit:view";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "registration:view",
    "registration:verify",
    "registration:reject",
    "team:approve",
    "team:reject",
    "participant:view",
    "food:scan",
    "food:view",
    "food:manage",
    "config:edit",
    "phase:manage",
    "coordinator:manage",
    "user:manage",
    "credential:change",
    "export:data",
    "audit:view",
  ],
  COORDINATOR: [
    "dashboard:view",
    "registration:view",
    "participant:view",
    "food:view",
    "audit:view",
  ],
  FOOD_ADMIN: [
    "food:scan",
    "food:view",
    "food:manage",
  ],
  PARTICIPANT: [],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function assertCan(role: Role | undefined | null, permission: Permission): void {
  if (!can(role, permission)) {
    throw new PermissionError(`Role ${role ?? "anonymous"} lacks permission ${permission}`);
  }
}

export class PermissionError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}
