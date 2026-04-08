CREATE TABLE "ProviderTeamAlias" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "teamId" TEXT,
    "externalAlias" TEXT NOT NULL,
    "externalName" TEXT,
    "countryCode" TEXT,
    "confidence" DOUBLE PRECISION,
    "rawPayload" JSONB,

    CONSTRAINT "ProviderTeamAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamRatingSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "teamId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "ratingType" TEXT NOT NULL,
    "ratingValue" DOUBLE PRECISION NOT NULL,
    "externalTeamRef" TEXT NOT NULL,
    "countryCode" TEXT,
    "rawPayload" JSONB,

    CONSTRAINT "TeamRatingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderTeamAlias_providerId_externalAlias_key" ON "ProviderTeamAlias"("providerId", "externalAlias");
CREATE INDEX "ProviderTeamAlias_teamId_idx" ON "ProviderTeamAlias"("teamId");
CREATE INDEX "ProviderTeamAlias_providerId_countryCode_idx" ON "ProviderTeamAlias"("providerId", "countryCode");

CREATE UNIQUE INDEX "TeamRatingSnapshot_providerId_ratingType_snapshotDate_externalTeamRef_countryCode_key"
ON "TeamRatingSnapshot"("providerId", "ratingType", "snapshotDate", "externalTeamRef", "countryCode");
CREATE INDEX "TeamRatingSnapshot_teamId_snapshotDate_idx" ON "TeamRatingSnapshot"("teamId", "snapshotDate");
CREATE INDEX "TeamRatingSnapshot_providerId_snapshotDate_idx" ON "TeamRatingSnapshot"("providerId", "snapshotDate");

ALTER TABLE "ProviderTeamAlias"
ADD CONSTRAINT "ProviderTeamAlias_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProviderTeamAlias"
ADD CONSTRAINT "ProviderTeamAlias_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeamRatingSnapshot"
ADD CONSTRAINT "TeamRatingSnapshot_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamRatingSnapshot"
ADD CONSTRAINT "TeamRatingSnapshot_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
