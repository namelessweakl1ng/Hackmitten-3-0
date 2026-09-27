import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
describe("frontend deployment boundary", () => {
  test("contains no API route, database schema, or environment secrets", () => {
    expect(existsSync(join(root, "src/app/api/health/route.ts"))).toBe(false);
    expect(existsSync(join(root, "src/app/api/auth/[...nextauth]/route.ts"))).toBe(false);
    expect(existsSync(join(root, "prisma/schema.prisma"))).toBe(false);
    expect(existsSync(join(root, ".env"))).toBe(false);
  });
  test("does not install database, SMTP, or private image server packages", () => {
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    for (const name of ["@prisma/client", "prisma", "nodemailer", "sharp", "bcryptjs"]) expect(dependencies[name]).toBeUndefined();
  });
});
