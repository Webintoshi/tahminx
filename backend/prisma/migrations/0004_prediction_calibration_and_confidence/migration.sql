-- AlterTable
ALTER TABLE "Prediction"
  ADD COLUMN "rawProbabilities" JSONB,
  ADD COLUMN "calibratedProbabilities" JSONB,
  ADD COLUMN "rawConfidenceScore" INTEGER,
  ADD COLUMN "calibratedConfidenceScore" INTEGER,
  ADD COLUMN "isRecommended" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isLowConfidence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "avoidReason" TEXT;

-- CreateIndex
CREATE INDEX "Prediction_isLowConfidence_confidenceScore_createdAt_idx"
  ON "Prediction"("isLowConfidence", "confidenceScore", "createdAt");

-- CreateTable
CREATE TABLE "prediction_calibrations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "calibrationMethod" TEXT NOT NULL,
    "trainingSampleSize" INTEGER NOT NULL,
    "calibrationParams" JSONB NOT NULL,
    "calibrationMetrics" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "prediction_calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prediction_calibrations_modelVersionId_sport_predictionType_isActive_idx"
  ON "prediction_calibrations"("modelVersionId", "sport", "predictionType", "isActive");

-- CreateIndex
CREATE INDEX "prediction_calibrations_createdAt_idx"
  ON "prediction_calibrations"("createdAt");

-- AddForeignKey
ALTER TABLE "prediction_calibrations"
  ADD CONSTRAINT "prediction_calibrations_modelVersionId_fkey"
  FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
