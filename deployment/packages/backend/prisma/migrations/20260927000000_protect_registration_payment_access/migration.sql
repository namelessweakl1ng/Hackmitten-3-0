BEGIN;

ALTER TABLE "Team" ADD COLUMN "registrationAccessTokenHash" TEXT;
ALTER TABLE "Team" ADD COLUMN "registrationAccessExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Team_registrationAccessTokenHash_key" ON "Team"("registrationAccessTokenHash");

COMMIT;
