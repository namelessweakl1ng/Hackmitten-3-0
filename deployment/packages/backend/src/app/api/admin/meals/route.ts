import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { mealSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requirePermission("food:view");
    const meals = await db.meal.findMany({ orderBy: { type: "asc" } });
    return NextResponse.json({ meals });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("food:manage");
    const body = await req.json();
    const parsed = mealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const meal = await db.meal.create({ data: parsed.data });
    return NextResponse.json({ meal }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
