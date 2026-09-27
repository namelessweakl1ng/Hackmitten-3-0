import type { NextConfig } from "next";

const backendApiOrigin = process.env.BACKEND_API_ORIGIN?.trim().replace(/\/$/, "");
if (backendApiOrigin) {
  const parsedBackendOrigin = new URL(backendApiOrigin);
  if (!['http:', 'https:'].includes(parsedBackendOrigin.protocol) || parsedBackendOrigin.pathname !== "/" || parsedBackendOrigin.username || parsedBackendOrigin.password) {
    throw new Error("BACKEND_API_ORIGIN must be an http(s) origin without credentials or a path");
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      ...(backendApiOrigin ? [{ source: "/api/:path*", destination: `${backendApiOrigin}/api/:path*` }] : []),
      {
        source: "/api/registrations/check-team-name",
        destination: "/api/registrations",
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
