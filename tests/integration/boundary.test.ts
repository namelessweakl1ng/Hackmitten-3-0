import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("architecture boundaries", () => {
  it("frontend contains no Prisma import or SMTP credential usage", () => {
    const matches = ["frontend/src"];
    const hasPrisma = matches.some((target) => {
      const p = path.join(root, target);
      let result = false;
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            const text = fs.readFileSync(full, "utf8");
            if (text.includes("@prisma/client") || text.includes("SMTP_PASSWORD") || text.includes("DATABASE_URL")) result = true;
          }
        }
      };
      walk(p);
      return result;
    });
    expect(hasPrisma).toBe(false);
  });

  it("frontend delegates API requests to the backend", () => {
    const frontendConfig = read("frontend/next.config.ts");
    expect(frontendConfig).toContain('output: "export"');
    expect(fs.existsSync(path.join(root, "frontend/src/app/api"))).toBe(false);
  });

  it("backend owns the config and storage responsibilities", () => {
    const backendText = read("backend/src/config/env.ts");
    expect(backendText).toContain("HM3_PRIVATE_UPLOAD_DIR");
    expect(backendText).toContain("HACKMITTEN_STORAGE_ROOT");
  });

  it("health endpoint contract exists at the backend boundary", () => {
    const route = read("backend/src/app/api/health/route.ts");
    expect(route).toContain("db.$queryRaw`SELECT 1`");
    expect(route).toContain('status: "unavailable"');
    expect(route).toContain("status: 503");
  });
});
