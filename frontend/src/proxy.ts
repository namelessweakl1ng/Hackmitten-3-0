import { NextRequest, NextResponse } from "next/server";

const allowedOrigins = new Set(
  (process.env.BACKEND_CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("https://hackmitten-3-0-api.mitt.edu.in/api/")) return NextResponse.next();

  const origin = request.headers.get("origin");
  const sameOrigin = origin === requestOrigin(request);
  if (origin && !sameOrigin && !allowedOrigins.has(origin)) {
    return NextResponse.json({ error: "Origin is not allowed" }, { status: 403 });
  }

  if (request.method === "OPTIONS") {
    if (!origin) return new Response(null, { status: 204 });
    const response = new Response(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
    response.headers.set("Access-Control-Max-Age", "600");
    response.headers.set("Vary", "Origin");
    return response;
  }

  const response = NextResponse.next();
  if (origin && (sameOrigin || allowedOrigins.has(origin))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Expose-Headers", "Content-Disposition");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export const config = { matcher: ["https://hackmitten-3-0-api.mitt.edu.in/api/:path*"] };
