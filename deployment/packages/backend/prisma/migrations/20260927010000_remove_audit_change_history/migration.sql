-- Retire the two operational history features only. No registration, payment,
-- participant, meal, check-in, or user table is altered.
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_teamId_fkey";
ALTER TABLE "ChangeHistory" DROP CONSTRAINT "ChangeHistory_changedById_fkey";
ALTER TABLE "ChangeHistory" DROP CONSTRAINT "ChangeHistory_rolledBackById_fkey";

DROP TABLE "AuditLog";
DROP TABLE "ChangeHistory";
DROP TYPE "ChangeHistorySection";
