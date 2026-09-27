ALTER TABLE "Team"
ADD COLUMN "registrationAcknowledgementSentAt" TIMESTAMP(3);

-- Preserve the existing at-most-once behavior for attempts recorded before delivery tracking.
UPDATE "Team"
SET "registrationAcknowledgementSentAt" = "registrationAcknowledgementAttemptedAt"
WHERE "registrationAcknowledgementAttemptedAt" IS NOT NULL;
