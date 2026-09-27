import type { IncomingMessage, ServerResponse } from "node:http";

export async function getHealthStatus(): Promise<{ status: string; ok: boolean; timestamp: string }> {
  return {
    status: "ok",
    ok: true,
    timestamp: new Date().toISOString(),
  };
}

export async function handleHealthRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const payload = await getHealthStatus();
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
