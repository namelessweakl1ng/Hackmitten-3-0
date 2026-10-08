import { resolve } from "node:path";
import type { NextConfig } from "next";

const backendApiOrigin = (process.env.BACKEND_API_ORIGIN ?? "http://127.0.0.1:3001").trim().replace(/\/$/, "");
const parsedBackendOrigin = new URL(backendApiOrigin);
if (!["http:", "https:"].includes(parsedBackendOrigin.protocol) || parsedBackendOrigin.pathname !== "/" || parsedBackendOrigin.username || parsedBackendOrigin.password) {
  throw new Error("BACKEND_API_ORIGIN must be an http(s) origin without credentials or a path");
}

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
