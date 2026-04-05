ALTER TABLE "ProviderTeamMapping"
  ALTER COLUMN "teamId" DROP NOT NULL,
  ADD COLUMN "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "rawPayload" JSONB;

ALTER TABLE "ProviderLeagueMapping"
  ALTER COLUMN "leagueId" DROP NOT NULL,
  ADD COLUMN "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "rawPayload" JSONB;

ALTER TABLE "ProviderMatchMapping"
  ALTER COLUMN "matchId" DROP NOT NULL,
  ADD COLUMN "confidence" DOUBLE PRECISION,
  ADD COLUMN "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "rawPayload" JSONB;

ALTER TABLE "IngestionJobRun"
  ADD COLUMN "rawPayload" JSONB;

CREATE UNIQUE INDEX "FeatureSet_matchId_modelFamily_key" ON "FeatureSet"("matchId", "modelFamily");
CREATE INDEX "ProviderTeamMapping_providerId_reviewNeeded_idx" ON "ProviderTeamMapping"("providerId", "reviewNeeded");
CREATE INDEX "ProviderLeagueMapping_providerId_reviewNeeded_idx" ON "ProviderLeagueMapping"("providerId", "reviewNeeded");
CREATE INDEX "ProviderMatchMapping_providerId_reviewNeeded_idx" ON "ProviderMatchMapping"("providerId", "reviewNeeded");