import { PrismaClient } from "@prisma/client";

// Force new client on schema version changes
const SCHEMA_VERSION = "v3-2026-09-06-changehistory";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; __prismaVersion?: string };

// If schema version changed, discard the cached client
if (globalForPrisma.__prismaVersion !== SCHEMA_VERSION) {
  if (globalForPrisma.prisma) {
    try { globalForPrisma.prisma.$disconnect(); } catch { /* ignore */ }
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.__prismaVersion = SCHEMA_VERSION;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
