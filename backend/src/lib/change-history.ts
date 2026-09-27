import { db } from "@/lib/db";
import type { ChangeHistorySection } from "@prisma/client";

/**
 * Record a change in the ChangeHistory table — enables rollback.
 *
 * Call this BEFORE making the change (to capture previousState accurately),
 * or pass previousState manually if you've already fetched it.
 */
export async function recordChange(opts: {
  section: ChangeHistorySection;
  entityId: string;
  entityType: string;
  action: string; // "UPDATE" | "CREATE" | "DELETE" | "APPROVE" | "REJECT" | "VERIFY" | etc.
  previousState?: any | null;
  newState?: any | null;
  changedById?: string | null;
}): Promise<void> {
  try {
    await db.changeHistory.create({
      data: {
        section: opts.section,
        entityId: opts.entityId,
        entityType: opts.entityType,
        action: opts.action,
        previousState: opts.previousState != null ? JSON.stringify(opts.previousState) : "null",
        newState: opts.newState != null ? JSON.stringify(opts.newState) : "null",
        changedById: opts.changedById ?? null,
      },
    });
  } catch {
    // Never let history recording break the primary operation
    console.error("[change-history] failed to record");
  }
}

/**
 * Helper: capture the previous state of a row before update.
 * Returns a plain object suitable for JSON serialization.
 */
export function snapshotRow(row: any): any {
  if (!row) return null;
  // Strip relation fields (objects/arrays) to keep the snapshot lean & JSON-safe
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (Array.isArray(v)) continue; // skip relations
    else if (v && typeof v === "object" && !(v instanceof Date)) continue; // skip relations
    else out[k] = v;
  }
  return out;
}
