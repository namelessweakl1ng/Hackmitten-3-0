import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_API_ORIGIN ?? "http://localhost:3001";

async function handler(req: NextRequest) {
  const url = req.url.replace(/^https?:\/\/[^/]+/, BACKEND);
  const res = await fetch(url, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    // @ts-expect-error – Node 18 fetch supports duplex
    duplex: "half",
  });
  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}

export { handler as GET, handler as POST };
