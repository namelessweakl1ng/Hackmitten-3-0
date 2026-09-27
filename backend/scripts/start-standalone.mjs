import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.PORT ??= "3001";
await import(pathToFileURL(path.resolve(".next/standalone/backend/server.js")).href);