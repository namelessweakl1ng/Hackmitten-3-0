import http from "node:http";
import { backendConfig } from "./config/env";
import { handleHealthRoute } from "./routes/health";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/api/health") {
    await handleHealthRoute(req, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.listen(backendConfig.port, "127.0.0.1", () => {
  console.log(`Hackmitten backend listening on http://127.0.0.1:${backendConfig.port}`);
});
