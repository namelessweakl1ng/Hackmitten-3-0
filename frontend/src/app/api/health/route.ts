import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "available" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("[health] database readiness check failed");
    return NextResponse.json({ status: "unavailable", database: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
