CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'PARTNER',
    "customTier" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sponsor_sortOrder_createdAt_idx" ON "Sponsor"("sortOrder", "createdAt");

INSERT INTO "Sponsor" ("id", "name", "logoUrl", "tier", "sortOrder", "updatedAt") VALUES
('sponsor_vigyanlabs', 'VigyanLabs', '/images/sponsors/Vlabs.jpeg', 'TITLE', 0, CURRENT_TIMESTAMP),
('sponsor_suce_step', 'SUCE-STEP', '/images/sponsors/logo1.png', 'PARTNER', 1, CURRENT_TIMESTAMP),
('sponsor_cynefian', 'CYNEFIAN Pvt. Ltd.', '/images/sponsors/logo2.png', 'PARTNER', 2, CURRENT_TIMESTAMP),
('sponsor_1by0grit', '1by0grit.com', '/images/sponsors/logo3.png', 'PARTNER', 3, CURRENT_TIMESTAMP);
