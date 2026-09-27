import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { jsonError } from "@/lib/api-auth";
import { passwordChangeSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

/**
 * POST /api/admin/credentials
 * Change super-admin username + password.
 *
 * Requires EITHER:
 *   - authenticated super-admin session, OR
 *   - valid BERSERK recovery key (matched against stored bcrypt hash)
 *
 * Body: { newUsername, newPassword, recoveryKey }
 *
 * The recoveryKey is ALWAYS required, even for an authenticated super-admin,
 * as a second factor. The recovery key is verified against the bcrypt-hashed
 * recoveryHash stored on the super-admin user record.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { newUsername, newPassword, recoveryKey } = parsed.data;

    // Find the super-admin (single root account)
    const superAdmin = await db.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });
    if (!superAdmin) {
      return NextResponse.json({ error: "No super admin exists" }, { status: 500 });
    }
    if (!superAdmin.recoveryHash) {
      return NextResponse.json(
        { error: "Recovery mechanism not initialized. Re-run the seed script." },
        { status: 500 },
      );
    }

    // Verify recovery key against stored hash
    const recoveryOk = await bcrypt.compare(recoveryKey, superAdmin.recoveryHash);
    if (!recoveryOk) {
      return NextResponse.json(
        { error: "Invalid BERSERK recovery key" },
        { status: 403 },
      );
    }

    // Check username uniqueness (excluding self)
    if (newUsername.toLowerCase() !== superAdmin.username.toLowerCase()) {
      const clash = await db.user.findUnique({ where: { username: newUsername } });
      if (clash) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: superAdmin.id },
      data: { username: newUsername, passwordHash: newHash },
    });

    await writeAudit({
      userId: superAdmin.id,
      action: "PASSWORD_CHANGED",
      detail: `Username updated to ${newUsername}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err);
  }
}
