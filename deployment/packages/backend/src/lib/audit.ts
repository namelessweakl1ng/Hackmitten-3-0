import { db } from "@/lib/db";

export async function writeAudit(opts: {
  userId?: string | null;
  teamId?: string | null;
  action: string;
  detail?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        teamId: opts.teamId ?? null,
        action: opts.action,
        detail: opts.detail ?? null,
      },
    });
  } catch {
    // Never let audit failure break the primary operation
    console.error("[audit] failed to write log");
  }
}
