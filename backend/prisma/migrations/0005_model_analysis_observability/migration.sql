-- AlterTable
ALTER TABLE "ModelVersion"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "model_comparison_snapshots" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "leagueId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "logLoss" DOUBLE PRECISION NOT NULL,
    "brierScore" DOUBLE PRECISION NOT NULL,
    "avgConfidenceScore" DOUBLE PRECISION NOT NULL,
    "calibrationQuality" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "model_comparison_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "model_performance_timeseries" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "leagueId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "logLoss" DOUBLE PRECISION NOT NULL,
    "brierScore" DOUBLE PRECISION NOT NULL,
    "avgConfidenceScore" DOUBLE PRECISION NOT NULL,
    "calibrationQuality" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    CONSTRAINT "model_performance_timeseries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "feature_importance_snapshots" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "importanceScore" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "feature_importance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "failed_prediction_analyses" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "predictionId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "leagueId" TEXT,
    "confidenceScore" INTEGER NOT NULL,
    "isHighConfidence" BOOLEAN NOT NULL,
    "predictedOutcome" TEXT NOT NULL,
    "actualOutcome" TEXT NOT NULL,
    "reasonFlags" JSONB NOT NULL,
    "impacts" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    CONSTRAINT "failed_prediction_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "model_comparison_snapshots_modelVersionId_sport_scopeKey_createdAt_idx"
  ON "model_comparison_snapshots"("modelVersionId", "sport", "scopeKey", "createdAt");

CREATE INDEX IF NOT EXISTS "model_comparison_snapshots_leagueId_createdAt_idx"
  ON "model_comparison_snapshots"("leagueId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "model_performance_timeseries_modelVersionId_sport_scopeKey_date_key"
  ON "model_performance_timeseries"("modelVersionId", "sport", "scopeKey", "date");

CREATE INDEX IF NOT EXISTS "model_performance_timeseries_date_sport_scopeKey_idx"
  ON "model_performance_timeseries"("date", "sport", "scopeKey");

CREATE INDEX IF NOT EXISTS "feature_importance_snapshots_modelVersionId_sport_updatedAt_idx"
  ON "feature_importance_snapshots"("modelVersionId", "sport", "updatedAt");

CREATE INDEX IF NOT EXISTS "feature_importance_snapshots_sport_featureName_updatedAt_idx"
  ON "feature_importance_snapshots"("sport", "featureName", "updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "failed_prediction_analyses_predictionId_key"
  ON "failed_prediction_analyses"("predictionId");

CREATE INDEX IF NOT EXISTS "failed_prediction_analyses_modelVersionId_createdAt_idx"
  ON "failed_prediction_analyses"("modelVersionId", "createdAt");

CREATE INDEX IF NOT EXISTS "failed_prediction_analyses_sport_createdAt_idx"
  ON "failed_prediction_analyses"("sport", "createdAt");

CREATE INDEX IF NOT EXISTS "failed_prediction_analyses_leagueId_createdAt_idx"
  ON "failed_prediction_analyses"("leagueId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'model_comparison_snapshots_modelVersionId_fkey'
  ) THEN
    ALTER TABLE "model_comparison_snapshots"
      ADD CONSTRAINT "model_comparison_snapshots_modelVersionId_fkey"
      FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'model_comparison_snapshots_leagueId_fkey'
  ) THEN
    ALTER TABLE "model_comparison_snapshots"
      ADD CONSTRAINT "model_comparison_snapshots_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'model_performance_timeseries_modelVersionId_fkey'
  ) THEN
    ALTER TABLE "model_performance_timeseries"
      ADD CONSTRAINT "model_performance_timeseries_modelVersionId_fkey"
      FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'model_performance_timeseries_leagueId_fkey'
  ) THEN
    ALTER TABLE "model_performance_timeseries"
      ADD CONSTRAINT "model_performance_timeseries_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_importance_snapshots_modelVersionId_fkey'
  ) THEN
    ALTER TABLE "feature_importance_snapshots"
      ADD CONSTRAINT "feature_importance_snapshots_modelVersionId_fkey"
      FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'failed_prediction_analyses_predictionId_fkey'
  ) THEN
    ALTER TABLE "failed_prediction_analyses"
      ADD CONSTRAINT "failed_prediction_analyses_predictionId_fkey"
      FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'failed_prediction_analyses_modelVersionId_fkey'
  ) THEN
    ALTER TABLE "failed_prediction_analyses"
      ADD CONSTRAINT "failed_prediction_analyses_modelVersionId_fkey"
      FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'failed_prediction_analyses_matchId_fkey'
  ) THEN
    ALTER TABLE "failed_prediction_analyses"
      ADD CONSTRAINT "failed_prediction_analyses_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'failed_prediction_analyses_leagueId_fkey'
  ) THEN
    ALTER TABLE "failed_prediction_analyses"
      ADD CONSTRAINT "failed_prediction_analyses_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "feature_importance_snapshots_modelVersionId_sport_featureName_scopeKey_key"
  ON "feature_importance_snapshots"("modelVersionId", "sport", "featureName", "scopeKey");
