import type { NextConfig } from "next";

const backendApiOrigin = (process.env.BACKEND_API_ORIGIN ?? "http://127.0.0.1:3001").trim().replace(/\/$/, "");
const parsedBackendOrigin = new URL(backendApiOrigin);
if (!["http:", "https:"].includes(parsedBackendOrigin.protocol) || parsedBackendOrigin.pathname !== "/" || parsedBackendOrigin.username || parsedBackendOrigin.password) {
  throw new Error("BACKEND_API_ORIGIN must be an http(s) origin without credentials or a path");
}

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiOrigin}/api/:path*`,
      },
      {
        source: "/uploads/:fileName",
        destination: `${backendApiOrigin}/api/uploads/:fileName`,
      },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
