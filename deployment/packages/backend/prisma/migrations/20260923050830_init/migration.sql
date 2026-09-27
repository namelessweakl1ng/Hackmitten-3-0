-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COORDINATOR', 'FOOD_ADMIN', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CoordinatorType" AS ENUM ('STUDENT', 'FACULTY');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('TITLE', 'PLATINUM', 'GOLD', 'SILVER', 'PARTNER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChangeHistorySection" AS ENUM ('EVENT_CONFIG', 'HERO', 'ABOUT', 'PHASE', 'GALLERY', 'SPONSOR', 'COORDINATOR', 'WINNER', 'MEAL', 'TEAM', 'PAYMENT', 'FOOD_CHECKIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PARTICIPANT',
    "recoveryHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "eventName" TEXT NOT NULL DEFAULT 'Hackmitten 3.0',
    "edition" TEXT NOT NULL DEFAULT '3.0',
    "tagline" TEXT NOT NULL DEFAULT 'IDEAS BEYOND THE HORIZON',
    "description" TEXT NOT NULL DEFAULT '24 hours. Real problems. Limitless possibilities.',
    "eventStartDate" TEXT NOT NULL DEFAULT '',
    "eventStartTime" TEXT NOT NULL DEFAULT '09:00',
    "eventEndDate" TEXT NOT NULL DEFAULT '',
    "eventEndTime" TEXT NOT NULL DEFAULT '09:00',
    "eventTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "eventDurationHours" INTEGER NOT NULL DEFAULT 24,
    "registrationDeadline" TEXT NOT NULL DEFAULT '',
    "registrationFee" TEXT NOT NULL DEFAULT '₹800',
    "prizePool" TEXT NOT NULL DEFAULT '₹1,00,000',
    "registrationCapacity" INTEGER NOT NULL DEFAULT 60,
    "registrationsOpen" BOOLEAN NOT NULL DEFAULT true,
    "heroHeading" TEXT NOT NULL DEFAULT 'HACKMITTEN',
    "heroEdition" TEXT NOT NULL DEFAULT '3.0',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'IDEAS BEYOND THE HORIZON',
    "heroDescription" TEXT NOT NULL DEFAULT '24 hours. Real problems. Limitless possibilities.',
    "heroCtaText" TEXT NOT NULL DEFAULT 'REGISTER NOW',
    "heroCtaLink" TEXT NOT NULL DEFAULT '/register',
    "heroVisible" BOOLEAN NOT NULL DEFAULT true,
    "aboutHeading" TEXT NOT NULL DEFAULT 'BUILD. BREAK. REBUILD.',
    "aboutDescription" TEXT NOT NULL DEFAULT 'Hackmitten is not a hackathon. It is a descent into the unknown — a place where ideas cross the event horizon and emerge as something built, broken, and rebuilt into existence.',
    "aboutStatDuration" TEXT NOT NULL DEFAULT '24',
    "aboutStatTeamSize" TEXT NOT NULL DEFAULT '3—4',
    "aboutStatFee" TEXT NOT NULL DEFAULT '₹800',
    "aboutStatPrize" TEXT NOT NULL DEFAULT '₹1,00,000',
    "aboutStatVenue" TEXT NOT NULL DEFAULT 'MAHARAJA INSTITUTE OF TECHNOLOGY THANDAVAPURA',
    "footerText" TEXT NOT NULL DEFAULT 'SEE YOU AT THE EVENT HORIZON.',
    "collegeName" TEXT NOT NULL DEFAULT 'MAHARAJA INSTITUTE OF TECHNOLOGY THANDAVAPURA',
    "collegeLogoUrl" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT 'hodcse@mitt.edu.in',
    "upiId" TEXT NOT NULL DEFAULT 'hackmitten@upi',
    "upiQrUrl" TEXT NOT NULL DEFAULT '',
    "winnersVisible" BOOLEAN NOT NULL DEFAULT false,
    "winnersHeading" TEXT NOT NULL DEFAULT 'THE MISSION IS COMPLETE.',
    "winnersSubheading" TEXT NOT NULL DEFAULT 'MEET THE WINNERS.',
    "socialLinks" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HackathonPhase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endDate" TEXT,
    "endTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HackathonPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "registrationId" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "college" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "degree" TEXT,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "participantId" TEXT,
    "qrToken" TEXT,
    "passVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "transactionId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentScreenshot" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "type" "MealType" NOT NULL DEFAULT 'CUSTOM',
    "label" TEXT NOT NULL DEFAULT 'Lunch',
    "date" TEXT,
    "startTime" TEXT NOT NULL DEFAULT '12:00',
    "endTime" TEXT NOT NULL DEFAULT '14:00',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodCheckIn" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "checkedInById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoordinatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "type" "CoordinatorType" NOT NULL DEFAULT 'STUDENT',
    "phone" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoordinatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "imageUrl" TEXT NOT NULL,
    "year" TEXT NOT NULL DEFAULT '2024',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "tier" "SponsorTier" NOT NULL DEFAULT 'PARTNER',
    "customTier" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Winner" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "positionLabel" TEXT NOT NULL DEFAULT '1st Place',
    "teamName" TEXT NOT NULL,
    "prize" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Winner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeHistory" (
    "id" TEXT NOT NULL,
    "section" "ChangeHistorySection" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousState" TEXT NOT NULL,
    "newState" TEXT NOT NULL,
    "changedById" TEXT,
    "rolledBack" BOOLEAN NOT NULL DEFAULT false,
    "rolledBackById" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "HackathonPhase_sortOrder_idx" ON "HackathonPhase"("sortOrder");

-- CreateIndex
CREATE INDEX "HackathonPhase_visible_idx" ON "HackathonPhase"("visible");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamName_key" ON "Team"("teamName");

-- CreateIndex
CREATE UNIQUE INDEX "Team_registrationId_key" ON "Team"("registrationId");

-- CreateIndex
CREATE INDEX "Team_status_idx" ON "Team"("status");

-- CreateIndex
CREATE INDEX "Team_college_idx" ON "Team"("college");

-- CreateIndex
CREATE INDEX "Team_registrationId_idx" ON "Team"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_participantId_key" ON "Participant"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_qrToken_key" ON "Participant"("qrToken");

-- CreateIndex
CREATE INDEX "Participant_teamId_idx" ON "Participant"("teamId");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "Participant"("email");

-- CreateIndex
CREATE INDEX "Participant_phone_idx" ON "Participant"("phone");

-- CreateIndex
CREATE INDEX "Participant_qrToken_idx" ON "Participant"("qrToken");

-- CreateIndex
CREATE INDEX "Participant_isLeader_idx" ON "Participant"("isLeader");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_teamId_key" ON "Payment"("teamId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentScreenshot_paymentId_idx" ON "PaymentScreenshot"("paymentId");

-- CreateIndex
CREATE INDEX "FoodCheckIn_mealId_createdAt_idx" ON "FoodCheckIn"("mealId", "createdAt");

-- CreateIndex
CREATE INDEX "FoodCheckIn_participantId_idx" ON "FoodCheckIn"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodCheckIn_participantId_mealId_key" ON "FoodCheckIn"("participantId", "mealId");

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorProfile_userId_key" ON "CoordinatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CoordinatorProfile_type_idx" ON "CoordinatorProfile"("type");

-- CreateIndex
CREATE INDEX "CoordinatorProfile_visible_idx" ON "CoordinatorProfile"("visible");

-- CreateIndex
CREATE INDEX "GalleryItem_year_idx" ON "GalleryItem"("year");

-- CreateIndex
CREATE INDEX "GalleryItem_sortOrder_idx" ON "GalleryItem"("sortOrder");

-- CreateIndex
CREATE INDEX "GalleryItem_visible_idx" ON "GalleryItem"("visible");

-- CreateIndex
CREATE INDEX "Sponsor_tier_idx" ON "Sponsor"("tier");

-- CreateIndex
CREATE INDEX "Sponsor_visible_idx" ON "Sponsor"("visible");

-- CreateIndex
CREATE INDEX "Sponsor_sortOrder_idx" ON "Sponsor"("sortOrder");

-- CreateIndex
CREATE INDEX "Winner_position_idx" ON "Winner"("position");

-- CreateIndex
CREATE INDEX "Winner_visible_idx" ON "Winner"("visible");

-- CreateIndex
CREATE INDEX "Winner_sortOrder_idx" ON "Winner"("sortOrder");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_teamId_idx" ON "AuditLog"("teamId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChangeHistory_section_idx" ON "ChangeHistory"("section");

-- CreateIndex
CREATE INDEX "ChangeHistory_entityId_idx" ON "ChangeHistory"("entityId");

-- CreateIndex
CREATE INDEX "ChangeHistory_changedById_idx" ON "ChangeHistory"("changedById");

-- CreateIndex
CREATE INDEX "ChangeHistory_createdAt_idx" ON "ChangeHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ChangeHistory_rolledBack_idx" ON "ChangeHistory"("rolledBack");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentScreenshot" ADD CONSTRAINT "PaymentScreenshot_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodCheckIn" ADD CONSTRAINT "FoodCheckIn_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodCheckIn" ADD CONSTRAINT "FoodCheckIn_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodCheckIn" ADD CONSTRAINT "FoodCheckIn_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoordinatorProfile" ADD CONSTRAINT "CoordinatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeHistory" ADD CONSTRAINT "ChangeHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeHistory" ADD CONSTRAINT "ChangeHistory_rolledBackById_fkey" FOREIGN KEY ("rolledBackById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
