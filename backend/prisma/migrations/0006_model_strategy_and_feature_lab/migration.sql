-- AlterTable
ALTER TABLE "Prediction"
  ADD COLUMN IF NOT EXISTS "modelStrategyId" TEXT,
  ADD COLUMN IF NOT EXISTS "usedStrategy" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "model_strategies" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sport" TEXT NOT NULL,
  "leagueId" TEXT,
  "predictionType" TEXT NOT NULL,
  "primaryModelVersionId" TEXT NOT NULL,
  "fallbackModelVersionId" TEXT,
  "ensembleConfig" JSONB NOT NULL,
  "calibrationProfileId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "model_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "feature_lab_sets" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sport" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "enabledFeatures" JSONB NOT NULL,
  "featureGroups" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  CONSTRAINT "feature_lab_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "feature_lab_experiments" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "featureSetId" TEXT NOT NULL,
  "modelVersionId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "leagueId" TEXT,
  "predictionType" TEXT NOT NULL,
  "fromDate" TIMESTAMP(3) NOT NULL,
  "toDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "sampleSize" INTEGER NOT NULL,
  "metrics" JSONB NOT NULL,
  CONSTRAINT "feature_lab_experiments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "model_strategies_sport_leagueId_predictionType_key"
  ON "model_strategies"("sport", "leagueId", "predictionType");

CREATE INDEX IF NOT EXISTS "model_strategies_sport_isActive_predictionType_idx"
  ON "model_strategies"("sport", "isActive", "predictionType");

CREATE INDEX IF NOT EXISTS "model_strategies_leagueId_isActive_idx"
  ON "model_strategies"("leagueId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "feature_lab_sets_sport_name_version_key"
  ON "feature_lab_sets"("sport", "name", "version");

CREATE INDEX IF NOT EXISTS "feature_lab_sets_sport_isActive_idx"
  ON "feature_lab_sets"("sport", "isActive");

CREATE INDEX IF NOT EXISTS "feature_lab_experiments_featureSetId_createdAt_idx"
  ON "feature_lab_experiments"("featureSetId", "createdAt");

CREATE INDEX IF NOT EXISTS "feature_lab_experiments_modelVersionId_createdAt_idx"
  ON "feature_lab_experiments"("modelVersionId", "createdAt");

CREATE INDEX IF NOT EXISTS "feature_lab_experiments_sport_createdAt_idx"
  ON "feature_lab_experiments"("sport", "createdAt");

CREATE INDEX IF NOT EXISTS "Prediction_modelStrategyId_createdAt_idx"
  ON "Prediction"("modelStrategyId", "createdAt");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prediction_modelStrategyId_fkey') THEN
    ALTER TABLE "Prediction"
      ADD CONSTRAINT "Prediction_modelStrategyId_fkey"
      FOREIGN KEY ("modelStrategyId") REFERENCES "model_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_leagueId_fkey') THEN
    ALTER TABLE "model_strategies"
      ADD CONSTRAINT "model_strategies_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_primaryModelVersionId_fkey') THEN
    ALTER TABLE "model_strategies"
      ADD CONSTRAINT "model_strategies_primaryModelVersionId_fkey"
      FOREIGN KEY ("primaryModelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_fallbackModelVersionId_fkey') THEN
    ALTER TABLE "model_strategies"
      ADD CONSTRAINT "model_strategies_fallbackModelVersionId_fkey"
      FOREIGN KEY ("fallbackModelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_calibrationProfileId_fkey') THEN
    ALTER TABLE "model_strategies"
      ADD CONSTRAINT "model_strategies_calibrationProfileId_fkey"
      FOREIGN KEY ("calibrationProfileId") REFERENCES "prediction_calibrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_lab_experiments_featureSetId_fkey') THEN
    ALTER TABLE "feature_lab_experiments"
      ADD CONSTRAINT "feature_lab_experiments_featureSetId_fkey"
      FOREIGN KEY ("featureSetId") REFERENCES "feature_lab_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_lab_experiments_modelVersionId_fkey') THEN
    ALTER TABLE "feature_lab_experiments"
      ADD CONSTRAINT "feature_lab_experiments_modelVersionId_fkey"
      FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_lab_experiments_leagueId_fkey') THEN
    ALTER TABLE "feature_lab_experiments"
      ADD CONSTRAINT "feature_lab_experiments_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
