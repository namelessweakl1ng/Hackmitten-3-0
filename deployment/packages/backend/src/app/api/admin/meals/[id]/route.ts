import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { mealSchema } from "@/lib/validators";
import { recordChange, snapshotRow } from "@/lib/change-history";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("food:manage");
    const { id } = await params;
    const body = await req.json();
    const parsed = mealSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const previous = await db.meal.findUnique({ where: { id } });
    const meal = await db.meal.update({ where: { id }, data: parsed.data });
    await recordChange({
      section: "MEAL",
      entityId: id,
      entityType: "Meal",
      action: "UPDATE",
      previousState: previous ? snapshotRow(previous) : null,
      newState: snapshotRow(meal),
      changedById: ctx.userId,
    });
    return NextResponse.json({ meal });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("food:manage");
    const { id } = await params;
    const previous = await db.meal.findUnique({ where: { id } });
    await db.meal.delete({ where: { id } });
    await recordChange({
      section: "MEAL",
      entityId: id,
      entityType: "Meal",
      action: "DELETE",
      previousState: previous ? snapshotRow(previous) : null,
      newState: null,
      changedById: ctx.userId,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err);
  }
}
