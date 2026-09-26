import path from "node:path";
import { cp, mkdir } from "node:fs/promises";

const standalone = ".next/standalone";
await mkdir(`${standalone}/.next`, { recursive: true });
await cp(".next/static", `${standalone}/.next/static`, { recursive: true, force: true });
const legacyUploads = path.resolve("public/uploads");
await cp("public", `${standalone}/public`, {
  recursive: true,
  force: true,
  filter(source) {
    const relative = path.relative(legacyUploads, path.resolve(source));
    return relative.startsWith("..") || path.isAbsolute(relative);
  },
});
console.log("Standalone runtime prepared at .next/standalone");
