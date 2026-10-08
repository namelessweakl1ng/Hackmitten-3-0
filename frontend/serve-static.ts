import { serve } from "bun";
import { join } from "path";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // 1. Proxy /api and /uploads to the backend (mimicking Nginx)
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
      url.port = "3001";
      url.hostname = "127.0.0.1";
      return fetch(new Request(url.href, req));
    }

    // 2. Serve static files from the frontend/out/ directory
    let path = url.pathname;
    if (path === "/") path = "/index.html";
    
    let file = Bun.file(join(import.meta.dir, "out", path));
    
    if (!(await file.exists())) {
      file = Bun.file(join(import.meta.dir, "out", path + ".html"));
      if (!(await file.exists())) {
        const notFoundFile = Bun.file(join(import.meta.dir, "out", "404.html"));
        if (await notFoundFile.exists()) {
          return new Response(notFoundFile, { status: 404, headers: { "Content-Type": "text/html" } });
        }
        return new Response("404 Not Found", { status: 404 });
      }
    }
    
    // Bun correctly infers the Content-Type from the file extension automatically
    // But let's explicitly set it just to be 100% foolproof for strict browsers!
    const headers = new Headers();
    if (path.endsWith(".css")) headers.set("Content-Type", "text/css");
    else if (path.endsWith(".js")) headers.set("Content-Type", "application/javascript");
    else if (path.endsWith(".woff2")) headers.set("Content-Type", "font/woff2");
    
    return new Response(file, { headers });
  },
});

console.log("Local testing server running on http://localhost:3000");
console.log("Proxying /api traffic to http://127.0.0.1:3001");
