import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, jsonError } from "@/lib/api-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ensureOperationalUser } from "@/lib/operational-users";

const createSchema = z.object({
  username: z.string().min(4).max(60).regex(/^[a-zA-Z0-9_.\-]+$/),
  email: z.string().email(),
  name: z.string().max(100).optional(),
  role: z.enum(["COORDINATOR", "FOOD_ADMIN", "PARTICIPANT"]),
  password: z.string().min(8).max(200),
});

export async function GET() {
  try {
    await requirePermission("user:manage");
    const users = await db.user.findMany({
      select: {
        id: true, username: true, email: true, name: true, role: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ users });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("user:manage");
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const { username, email, name, role, password } = parsed.data;
    // Check uniqueness
    const clash = await db.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (clash) {
      return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });
    }
    if (role === "COORDINATOR" || role === "FOOD_ADMIN") {
      const user = await ensureOperationalUser({
        username,
        email,
        password,
        name: name ?? username,
        role,
      });
      return NextResponse.json({ user }, { status: 201 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { username, email, name, role, passwordHash },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
