import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { mealSchema } from "@/lib/validators";
import { recordChange, snapshotRow } from "@/lib/change-history";

export async function GET() {
  const meals = await db.meal.findMany({ orderBy: { type: "asc" } });
  return NextResponse.json({ meals });
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("food:manage");
    const body = await req.json();
    const parsed = mealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const meal = await db.meal.create({ data: parsed.data });
    await recordChange({
      section: "MEAL",
      entityId: meal.id,
      entityType: "Meal",
      action: "CREATE",
      previousState: null,
      newState: snapshotRow(meal),
      changedById: ctx.userId,
    });
    return NextResponse.json({ meal }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
