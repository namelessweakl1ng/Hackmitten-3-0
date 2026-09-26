BEGIN;
-- Static marketing content is code/assets. Preserve only registration controls.
ALTER TABLE "EventConfig" RENAME COLUMN "registrationsOpen" TO "registrationEnabled";
ALTER TABLE "EventConfig" RENAME COLUMN "registrationCapacity" TO "registrationLimit";
UPDATE "EventConfig" SET "registrationLimit" = NULL WHERE "registrationLimit" = 0;
ALTER TABLE "EventConfig" ALTER COLUMN "registrationLimit" DROP NOT NULL;
ALTER TABLE "EventConfig" ALTER COLUMN "registrationLimit" DROP DEFAULT;

ALTER TABLE "EventConfig"
  DROP COLUMN "eventName",
  DROP COLUMN "edition",
  DROP COLUMN "tagline",
  DROP COLUMN "description",
  DROP COLUMN "eventStartDate",
  DROP COLUMN "eventStartTime",
  DROP COLUMN "eventEndDate",
  DROP COLUMN "eventEndTime",
  DROP COLUMN "eventTimezone",
  DROP COLUMN "eventDurationHours",
  DROP COLUMN "registrationDeadline",
  DROP COLUMN "registrationFee",
  DROP COLUMN "prizePool",
  DROP COLUMN "heroHeading",
  DROP COLUMN "heroEdition",
  DROP COLUMN "heroSubtitle",
  DROP COLUMN "heroDescription",
  DROP COLUMN "heroCtaText",
  DROP COLUMN "heroCtaLink",
  DROP COLUMN "heroVisible",
  DROP COLUMN "aboutHeading",
  DROP COLUMN "aboutDescription",
  DROP COLUMN "aboutStatDuration",
  DROP COLUMN "aboutStatTeamSize",
  DROP COLUMN "aboutStatFee",
  DROP COLUMN "aboutStatPrize",
  DROP COLUMN "aboutStatVenue",
  DROP COLUMN "footerText",
  DROP COLUMN "collegeName",
  DROP COLUMN "collegeLogoUrl",
  DROP COLUMN "contactEmail",
  DROP COLUMN "upiId",
  DROP COLUMN "upiQrUrl",
  DROP COLUMN "winnersVisible",
  DROP COLUMN "winnersHeading",
  DROP COLUMN "winnersSubheading",
  DROP COLUMN "socialLinks";

-- Obsolete CMS rows are intentionally removed; operational/audit and registration data remain.
DROP TABLE IF EXISTS "Winner";
DROP TABLE IF EXISTS "Sponsor";
DROP TABLE IF EXISTS "GalleryItem";
DROP TABLE IF EXISTS "CoordinatorProfile";
DROP TABLE IF EXISTS "HackathonPhase";
DROP TYPE IF EXISTS "SponsorTier";
DROP TYPE IF EXISTS "CoordinatorType";
COMMIT;
