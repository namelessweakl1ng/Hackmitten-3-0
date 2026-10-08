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
        file = Bun.file(join(import.meta.dir, "out", "404.html"));
        if (!(await file.exists())) {
          return new Response("404 Not Found", { status: 404 });
        }
      }
    }
    
    return new Response(file);
  },
});

console.log("Local testing server running on http://localhost:3000");
console.log("Proxying /api traffic to http://127.0.0.1:3001");
