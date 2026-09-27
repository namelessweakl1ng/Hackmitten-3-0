import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/meals — list all meals
 */
export async function GET() {
  const meals = await db.meal.findMany({ orderBy: { type: "asc" } });
  return NextResponse.json({ meals });
}
