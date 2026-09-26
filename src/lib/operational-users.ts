import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

export const LOGIN_ROLE_MAP = {
  ADMIN: "SUPER_ADMIN",
  COORDINATOR: "COORDINATOR",
  FOOD: "FOOD_ADMIN",
} as const satisfies Record<string, Role>;

export type OperationalRole = (typeof LOGIN_ROLE_MAP)[keyof typeof LOGIN_ROLE_MAP];

type OperationalUserDatabase = Pick<typeof db, "user">;

export type SafeOperationalUser = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: OperationalRole;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CredentialGroup = {
  username: string;
  email: string;
  password: string;
};

export function readCredentialGroup(
  env: Record<string, string | undefined>,
  prefix: string,
): CredentialGroup | null {
  const names = ["USERNAME", "EMAIL", "PASSWORD"] as const;
  const values = names.map((name) => env[`${prefix}_${name}`]?.trim() ?? "");
  const provided = values.filter(Boolean).length;

  if (provided === 0) return null;
  if (provided !== values.length) {
    throw new Error(`${prefix}_USERNAME, ${prefix}_EMAIL, and ${prefix}_PASSWORD must all be provided together`);
  }

  return { username: values[0], email: values[1], password: values[2] };
}

function safeUser(user: {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}): SafeOperationalUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role as OperationalRole,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    ...(user.updatedAt ? { updatedAt: user.updatedAt } : {}),
  };
}

export async function ensureOperationalUser({
  username,
  email,
  password,
  name,
  role,
  database = db,
}: CredentialGroup & { name: string; role: OperationalRole; database?: OperationalUserDatabase }): Promise<SafeOperationalUser> {
  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  if (!normalizedUsername || !normalizedEmail || !password || !normalizedName) {
    throw new Error("Operational user credentials and name must be non-empty");
  }
  if (!Object.values(LOGIN_ROLE_MAP).includes(role)) {
    throw new Error(`Unsupported operational user role: ${role}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await database.user.findFirst({
    where: {
      OR: [
        { username: { equals: normalizedUsername, mode: "insensitive" } },
        { email: normalizedEmail },
      ],
    },
  });

  const data = {
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    role,
    name: normalizedName,
  };

  if (existing && existing.role !== role) {
    throw new Error("Bootstrap credentials match an account with a different role; refusing to change its role");
  }

  const user = existing
    ? await database.user.update({ where: { id: existing.id }, data })
    : await database.user.create({ data });

  return safeUser(user);
}
