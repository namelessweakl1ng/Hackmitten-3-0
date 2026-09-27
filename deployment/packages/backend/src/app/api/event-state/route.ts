import { NextResponse } from "next/server";
import { getEventState } from "@/lib/event-state";

/**
 * GET /api/event-state
 * Public endpoint — returns the current event lifecycle state.
 * Used by the public site, registration page, and admin dashboard
 * to ensure consistent state across all consumers.
 */
export async function GET() {
  const info = await getEventState();
  return NextResponse.json(info);
}
