import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import { mealSchema } from "@/lib/validators";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("food:manage");
    const { id } = await params;
    const body = await req.json();
    const parsed = mealSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const meal = await db.meal.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ meal });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("food:manage");
    const { id } = await params;
    await db.meal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err as any).code === "P2003") {
      return NextResponse.json(
        { error: "This meal has check-ins and cannot be deleted. Disable it instead." },
        { status: 409 },
      );
    }
    return jsonError(err);
  }
}
