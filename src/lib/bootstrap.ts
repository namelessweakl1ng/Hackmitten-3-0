import { db } from "@/lib/db";
import { ensureOperationalUser } from "@/lib/operational-users";

type BootstrapDatabase = Pick<typeof db, "eventConfig" | "user">;

export const DEFAULT_EVENT_CONFIG = {
  id: "singleton",
  registrationEnabled: true,
  registrationLimit: 60,
} as const;

export async function ensureSingletonEventConfig(database: BootstrapDatabase = db) {
  const existing = await database.eventConfig.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;

  try {
    return await database.eventConfig.create({ data: DEFAULT_EVENT_CONFIG });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const createdByConcurrentBootstrap = await database.eventConfig.findUnique({
        where: { id: "singleton" },
      });
      if (createdByConcurrentBootstrap) return createdByConcurrentBootstrap;
    }
    throw error;
  }
}

export async function ensureSuperAdminBootstrap({
  username,
  email,
  password,
  database = db,
}: {
  username: string;
  email: string;
  password: string;
  database?: BootstrapDatabase;
}) {
  return ensureOperationalUser({
    username,
    email,
    password,
    name: "Super Admin",
    role: "SUPER_ADMIN",
    database,
  });
}
