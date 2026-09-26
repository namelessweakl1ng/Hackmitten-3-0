import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { writeAudit } from "@/lib/audit";
import { ensureSingletonEventConfig } from "@/lib/bootstrap";

export async function GET() {
  try {
    await requirePermission("config:edit");
    const config = await ensureSingletonEventConfig();
    return NextResponse.json({ config: {
      registrationEnabled: config.registrationEnabled,
      registrationLimit: config.registrationLimit,
    } });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("config:edit");
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid registration settings" }, { status: 400 });
    const data = body as Record<string, unknown>;
    if (Object.keys(data).some((key) => !["registrationEnabled", "registrationLimit"].includes(key))) {
      return NextResponse.json({ error: "Only registration settings can be changed" }, { status: 400 });
    }
    const current = await ensureSingletonEventConfig();
    const enabled = data.registrationEnabled === undefined ? current.registrationEnabled : data.registrationEnabled;
    const limit = data.registrationLimit === undefined ? current.registrationLimit : data.registrationLimit;
    if (typeof enabled !== "boolean" || !(limit === null || (typeof limit === "number" && Number.isSafeInteger(limit) && limit >= 1 && limit <= 1_000_000))) {
      return NextResponse.json({ error: "Registration enabled must be boolean and limit must be a positive integer or null" }, { status: 400 });
    }
    const updated = await db.eventConfig.update({ where: { id: "singleton" }, data: { registrationEnabled: enabled, registrationLimit: limit } });
    await writeAudit({ userId: actor.userId, action: "CONFIG_UPDATED", detail: "Registration controls updated" });
    return NextResponse.json({ config: { registrationEnabled: updated.registrationEnabled, registrationLimit: updated.registrationLimit } });
  } catch (error) { return jsonError(error); }
}
