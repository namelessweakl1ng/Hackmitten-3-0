import path from "node:path";
import { access, cp, mkdir, readdir, readFile, realpath, rm } from "node:fs/promises";

const standaloneRoot = path.resolve(".next/standalone");
const standalone = path.join(standaloneRoot, path.basename(process.cwd()));
await mkdir(`${standalone}/.next`, { recursive: true });
await cp(".next/static", `${standalone}/.next/static`, { recursive: true, force: true });
const nextPackage = JSON.parse(await readFile(path.join(standalone, "node_modules/next/package.json"), "utf8"));
const bunStore = path.join(standaloneRoot, "node_modules/.bun");
const nextStore = (await readdir(bunStore, { withFileTypes: true }))
  .find((entry) => entry.isDirectory() && entry.name.startsWith(`next@${nextPackage.version}+`));
if (!nextStore) throw new Error("Next.js runtime dependency store is missing from standalone output");
const nextDependencies = path.join(bunStore, nextStore.name, "node_modules");
for (const dependency of await readdir(nextDependencies)) {
  if (dependency !== "next") {
    const target = path.join(standalone, "node_modules", dependency);
    try {
      await access(target);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await cp(path.join(nextDependencies, dependency), target, {
        recursive: true,
        force: true,
        dereference: true,
      });
    }
  }
}
// Bun stores @prisma/client and its generated .prisma sibling in the same package store.
// Resolve both real package locations so this also works with npm-style installs.
const prismaPackage = path.dirname(await realpath("node_modules/@prisma/client/package.json"));
const generatedPrismaClient = path.resolve(prismaPackage, "../../.prisma/client");
const standalonePrismaPackage = path.dirname(await realpath(path.join(standalone, "node_modules/@prisma/client/package.json")));
const standalonePrismaClient = path.resolve(standalonePrismaPackage, "../../.prisma/client");
await mkdir(path.dirname(standalonePrismaClient), { recursive: true });
await cp(generatedPrismaClient, standalonePrismaClient, {
  recursive: true,
  force: true,
  dereference: true,
});
const legacyUploads = path.resolve("public/uploads");
try {
  await access("public");
  await cp("public", `${standalone}/public`, {
    recursive: true,
    force: true,
    filter(source) {
      const relative = path.relative(legacyUploads, path.resolve(source));
      return relative.startsWith("..") || path.isAbsolute(relative);
    },
  });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
for (const entry of await readdir(standalone, { withFileTypes: true })) {
  if (entry.isFile() && /^\.env(?:\.|$)/.test(entry.name)) {
    await rm(path.join(standalone, entry.name), { force: true });
  }
}
console.log("Standalone runtime prepared at .next/standalone");