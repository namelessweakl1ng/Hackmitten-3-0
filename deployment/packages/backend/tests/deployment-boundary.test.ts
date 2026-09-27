import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
describe("backend deployment boundary", () => {
  test("includes APIs and Prisma but no frontend pages or runtime secrets", () => {
    expect(existsSync(join(root, "src/app/api/health/route.ts"))).toBe(true);
    expect(existsSync(join(root, "prisma/schema.prisma"))).toBe(true);
    expect(existsSync(join(root, "src/app/page.tsx"))).toBe(false);
    expect(existsSync(join(root, ".env"))).toBe(false);
  });
  test("keeps SMTP and database secrets blank in the example", () => {
    const env = readFileSync(join(root, ".env.example"), "utf8");
    for (const key of ["DATABASE_URL", "SMTP_PASSWORD", "NEXTAUTH_SECRET"]) {
      const value = env.match(new RegExp("^" + key + "=(.*)$", "m"))?.[1];
      expect(value).toBe("");
    }
  });
});
