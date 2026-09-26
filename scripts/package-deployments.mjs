import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagesRoot = path.join(root, "deployment", "packages");
const artifactsRoot = path.join(root, "deployment", "artifacts");
const nginxHandoff = path.join(root, "deployment", "nginx");
const systemdHandoff = path.join(root, "deployment", "systemd");
const version = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;

const commonDevDependencies = {
  "@types/react": "^19",
  "@types/react-dom": "^19",
  eslint: "^9",
  "eslint-config-next": "^16",
  typescript: "^5",
};

const frontend = {
  name: "hackmitten-frontend",
  private: true,
  version,
  scripts: {
    dev: "next dev -p 3000",
    lint: "eslint .",
    typecheck: "tsc --noEmit",
    test: "bun test tests/frontend",
    build: "next build && node scripts/prepare-standalone.mjs",
    start: "node .next/standalone/server.js",
  },
  dependencies: {
    "@radix-ui/react-toast": "^1.2.14",
    "@react-three/drei": "^10.7.8",
    "@react-three/fiber": "^9.7.0",
    "@react-three/postprocessing": "^3.1.1",
    "@tanstack/react-query": "^5.82.0",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    "html5-qrcode": "^2.3.8",
    lenis: "^1.3.26",
    "lucide-react": "^0.525.0",
    next: "^16.1.1",
    "next-auth": "^4.24.11",
    "next-themes": "^0.4.6",
    qrcode: "^1.5.4",
    "qrcode.react": "^4.2.0",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    sonner: "^2.0.6",
    "tailwind-merge": "^3.3.1",
    three: "^0.185.1",
    zustand: "^5.0.6",
  },
  devDependencies: {
    ...commonDevDependencies,
    "@types/qrcode": "^1.5.6",
    "@tailwindcss/postcss": "^4",
    tailwindcss: "^4",
  },
};

const backend = {
  name: "hackmitten-backend",
  private: true,
  version,
  scripts: {
    dev: "next dev -p 3001",
    lint: "eslint .",
    typecheck: "tsc --noEmit",
    test: "bun test tests",
    build: "prisma generate && next build && node scripts/prepare-standalone.mjs",
    start: "node .next/standalone/server.js",
    "db:generate": "prisma generate",
    "db:validate": "prisma validate",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:bootstrap": "bun run prisma/seed.ts",
  },
  dependencies: {
    "@prisma/client": "^6.11.1",
    bcryptjs: "^3.0.3",
    next: "^16.1.1",
    "next-auth": "^4.24.11",
    nodemailer: "^10.0.10",
    prisma: "^6.11.1",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    sharp: "^0.34.5",
    zod: "^4.0.2",
  },
  devDependencies: {
    ...commonDevDependencies,
    "@types/bcryptjs": "^3.0.0",
    "@types/nodemailer": "^8.0.2",
    "bun-types": "^1.3.4",
  },
};

const frontendEnv = `# Optional same-origin dev proxy target. Production normally routes /api through Nginx.\n# This is an origin only; it is safe to expose to the frontend server, never a secret.\nBACKEND_API_ORIGIN=http://127.0.0.1:3001\n`;
const backendEnv = `# Backend only. Copy to a protected runtime env file and fill with real values.\nNODE_ENV=production\nHOSTNAME=127.0.0.1\nPORT=3001\nDATABASE_URL=\nDIRECT_URL=\nNEXTAUTH_URL=https://<public-frontend-domain>\nNEXTAUTH_SECRET=\nBACKEND_CORS_ORIGINS=https://<public-frontend-domain>,http://localhost:3000\nHACKMITTEN_STORAGE_ROOT=/var/lib/hackmitten\nSMTP_HOST=\nSMTP_PORT=587\nSMTP_USER=\nSMTP_PASSWORD=\nSMTP_FROM=\nHM3_BERSERK_SECRET=\nHM3_SUPER_ADMIN_USERNAME=hackmittenadmin2026\nHM3_SUPER_ADMIN_EMAIL=\nHM3_SUPER_ADMIN_PASSWORD=\nHM3_COORDINATOR_USERNAME=hackmitten2026\nHM3_COORDINATOR_EMAIL=\nHM3_COORDINATOR_PASSWORD=\nHM3_FOOD_ADMIN_USERNAME=hackmittenfood2026\nHM3_FOOD_ADMIN_EMAIL=\nHM3_FOOD_ADMIN_PASSWORD=\n`;

async function copyTree(source, destination, filter = () => true) {
  await cp(source, destination, { recursive: true, filter: (entry) => filter(path.relative(root, entry).replaceAll("\\", "/")) });
}

async function writePackage(packageRoot, manifest, env) {
  const pinFromRootLock = async (dependencies) => Object.fromEntries(await Promise.all(
    Object.keys(dependencies).map(async (name) => {
      const packageJson = path.join(root, "node_modules", ...name.split("/"), "package.json");
      try {
        const resolved = JSON.parse(await readFile(packageJson, "utf8"));
        return [name, resolved.version];
      } catch {
        throw new Error(`Dependency ${name} is not installed in the root lockfile workspace. Run bun install --frozen-lockfile first.`);
      }
    }),
  ));
  const lockedManifest = {
    ...manifest,
    packageManager: "bun@1.4.2",
    dependencies: await pinFromRootLock(manifest.dependencies),
    devDependencies: await pinFromRootLock(manifest.devDependencies),
  };
  await writeFile(path.join(packageRoot, "package.json"), `${JSON.stringify(lockedManifest, null, 2)}\n`);
  await writeFile(path.join(packageRoot, ".env.example"), env);
}

await rm(packagesRoot, { recursive: true, force: true });
await rm(artifactsRoot, { recursive: true, force: true });
await mkdir(packagesRoot, { recursive: true });
await mkdir(artifactsRoot, { recursive: true });
await mkdir(nginxHandoff, { recursive: true });
await mkdir(systemdHandoff, { recursive: true });
for (const file of ["nginx-hackmitten.conf", "nginx-limits.conf", "nginx-proxy-headers.conf"]) {
  await cp(path.join(root, "deploy", file), path.join(nginxHandoff, file));
}
for (const file of ["hackmitten-frontend.service", "hackmitten-backend.service"]) {
  await cp(path.join(root, "deploy", file), path.join(systemdHandoff, file));
}

const frontendRoot = path.join(packagesRoot, "frontend");
await mkdir(frontendRoot, { recursive: true });
await copyTree(path.join(root, "src"), path.join(frontendRoot, "src"), (rel) =>
  !rel.startsWith("src/app/api/") && (!rel.startsWith("src/lib/") || ["src/lib/team-name.ts", "src/lib/utils.ts"].includes(rel)),
);
await rm(path.join(frontendRoot, "src", "app", "api"), { recursive: true, force: true });
await copyTree(path.join(root, "public"), path.join(frontendRoot, "public"), (rel) => !rel.startsWith("public/uploads/"));
for (const file of ["next.config.ts", "tsconfig.json", "postcss.config.mjs", "eslint.config.mjs", "next-env.d.ts"]) {
  await cp(path.join(root, file), path.join(frontendRoot, file));
}
await cp(path.join(root, "src", "proxy.ts"), path.join(frontendRoot, "src", "proxy.ts"));
await mkdir(path.join(frontendRoot, "scripts"), { recursive: true });
await cp(path.join(root, "scripts", "prepare-standalone.mjs"), path.join(frontendRoot, "scripts", "prepare-standalone.mjs"));
await mkdir(path.join(frontendRoot, "tests", "frontend"), { recursive: true });
await writeFile(path.join(frontendRoot, "tests", "frontend", "package-boundary.test.ts"), `import { describe, expect, test } from "bun:test";\nimport { existsSync, readFileSync } from "node:fs";\nimport { join } from "node:path";\n\nconst root = join(import.meta.dir, "../..");\ndescribe("frontend deployment boundary", () => {\n  test("contains no API route, database schema, or environment secrets", () => {\n    expect(existsSync(join(root, "src/app/api/health/route.ts"))).toBe(false);\n    expect(existsSync(join(root, "src/app/api/auth/[...nextauth]/route.ts"))).toBe(false);\n    expect(existsSync(join(root, "prisma/schema.prisma"))).toBe(false);\n    expect(existsSync(join(root, ".env"))).toBe(false);\n  });\n  test("does not install database, SMTP, or private image server packages", () => {\n    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));\n    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };\n    for (const name of ["@prisma/client", "prisma", "nodemailer", "sharp", "bcryptjs"]) expect(dependencies[name]).toBeUndefined();\n  });\n});\n`);
await writePackage(frontendRoot, frontend, frontendEnv);

const backendRoot = path.join(packagesRoot, "backend");
await mkdir(backendRoot, { recursive: true });
await mkdir(path.join(backendRoot, "public"), { recursive: true });
await copyTree(path.join(root, "src", "app", "api"), path.join(backendRoot, "src", "app", "api"));
await copyTree(path.join(root, "src", "lib"), path.join(backendRoot, "src", "lib"));
await copyTree(path.join(root, "prisma"), path.join(backendRoot, "prisma"));
await mkdir(path.join(backendRoot, "src", "app"), { recursive: true });
await mkdir(path.join(backendRoot, "src", "app", "api"), { recursive: true });
await writeFile(path.join(backendRoot, "src", "app", "layout.tsx"), 'export default function RootLayout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }\n');
for (const file of ["next.config.ts", "tsconfig.json", "eslint.config.mjs", "next-env.d.ts"]) {
  await cp(path.join(root, file), path.join(backendRoot, file));
}
await cp(path.join(root, "src", "proxy.ts"), path.join(backendRoot, "src", "proxy.ts"));
await mkdir(path.join(backendRoot, "scripts"), { recursive: true });
await cp(path.join(root, "scripts", "prepare-standalone.mjs"), path.join(backendRoot, "scripts", "prepare-standalone.mjs"));
await mkdir(path.join(backendRoot, "tests"), { recursive: true });
await copyTree(path.join(root, "tests"), path.join(backendRoot, "tests"), (rel) => !rel.endsWith(".env") && !rel.endsWith(".db"));
await writeFile(path.join(backendRoot, "tests", "deployment-boundary.test.ts"), `import { describe, expect, test } from "bun:test";\nimport { existsSync, readFileSync } from "node:fs";\nimport { join } from "node:path";\n\nconst root = join(import.meta.dir, "..");\ndescribe("backend deployment boundary", () => {\n  test("includes APIs and Prisma but no frontend pages or runtime secrets", () => {\n    expect(existsSync(join(root, "src/app/api/health/route.ts"))).toBe(true);\n    expect(existsSync(join(root, "prisma/schema.prisma"))).toBe(true);\n    expect(existsSync(join(root, "src/app/page.tsx"))).toBe(false);\n    expect(existsSync(join(root, ".env"))).toBe(false);\n  });\n  test("keeps SMTP and database secrets blank in the example", () => {\n    const env = readFileSync(join(root, ".env.example"), "utf8");\n    for (const key of ["DATABASE_URL", "SMTP_PASSWORD", "NEXTAUTH_SECRET"]) {\n      const value = env.match(new RegExp("^" + key + "=(.*)$", "m"))?.[1];\n      expect(value).toBe("");\n    }\n  });\n});\n`);
await writePackage(backendRoot, backend, backendEnv);

for (const name of ["frontend", "backend"]) {
  const packageRoot = path.join(packagesRoot, name);
  await execFileAsync("bun", ["install", "--lockfile-only"], { cwd: packageRoot });
  await execFileAsync("tar", ["-czf", path.join(artifactsRoot, `hackmitten-${name}.tar.gz`), "-C", packageRoot, "."]);
}

const checksums = [];
for (const name of ["frontend", "backend"]) {
  const fileName = `hackmitten-${name}.tar.gz`;
  const bytes = await readFile(path.join(artifactsRoot, fileName));
  checksums.push(`${createHash("sha256").update(bytes).digest("hex")}  ${fileName}`);
}
await writeFile(path.join(artifactsRoot, "SHA256SUMS"), `${checksums.join("\n")}\n`);
console.log(`Source deployment packages created in ${path.relative(root, artifactsRoot)}. Build both packages on Linux before service activation.`);
