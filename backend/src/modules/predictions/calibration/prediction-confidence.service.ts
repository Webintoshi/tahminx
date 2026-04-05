import { Injectable } from '@nestjs/common';

@Injectable()
export class PredictionConfidenceService {
  compute(input: {
    rawConfidence: number;
    calibratedConfidence: number;
    sampleSize: number;
    dataQualityScore: number;
    modelDisagreement: number;
    missingPlayersCount: number;
    riskFlags: string[];
  }) {
    const raw = clamp01(input.rawConfidence);
    const calibrated = clamp01(input.calibratedConfidence);
    const sampleFactor = Math.min(1, Math.max(0, input.sampleSize / 300));
    const dataQuality = clamp01(input.dataQualityScore);
    const disagreementPenalty = clamp(0, 0.25, input.modelDisagreement) * 30;
    const missingPenalty = Math.min(12, Math.max(0, input.missingPlayersCount) * 2);
    const riskPenalty = Math.min(20, input.riskFlags.length * 3);

    const blended = calibrated * (0.78 + 0.22 * sampleFactor) + raw * 0.08 + dataQuality * 0.14;
    const score = Math.max(0, Math.min(100, Math.round(blended * 100 - disagreementPenalty - missingPenalty - riskPenalty)));

    return {
      rawConfidenceScore: Math.round(raw * 100),
      calibratedConfidenceScore: Math.round(calibrated * 100),
      finalConfidenceScore: score,
    };
  }
}

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => clamp(0, 1, value);
