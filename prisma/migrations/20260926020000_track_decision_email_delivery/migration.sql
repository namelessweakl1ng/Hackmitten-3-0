BEGIN;
ALTER TABLE "Team" ADD COLUMN "approvalEmailSentAt" TIMESTAMP(3), ADD COLUMN "rejectionEmailSentAt" TIMESTAMP(3), ADD COLUMN "registrationAcknowledgementAttemptCount" INTEGER NOT NULL DEFAULT 0;
COMMIT;
