import { Injectable } from '@nestjs/common';

export interface PredictionRiskInput {
  dataQualityScore: number;
  modelDisagreement: number;
  missingPlayersCount: number;
  trainingSampleSize: number;
  statsAgeHours: number;
  unstableFormScore: number;
  weakMappingConfidence: boolean;
  finalConfidenceScore: number;
}

@Injectable()
export class PredictionRiskFlagEngine {
  evaluate(input: PredictionRiskInput): {
    riskFlags: string[];
    isLowConfidence: boolean;
    isRecommended: boolean;
    avoidReason: string | null;
  } {
    const flags: string[] = [];

    if (input.dataQualityScore < 0.45) {
      flags.push('lowDataQuality');
    }
    if (input.modelDisagreement > 0.18) {
      flags.push('highModelDisagreement');
    }
    if (input.missingPlayersCount >= 3) {
      flags.push('missingKeyPlayers');
    }
    if (input.trainingSampleSize > 0 && input.trainingSampleSize < 120) {
      flags.push('lowSampleSize');
    }
    if (input.statsAgeHours > 96) {
      flags.push('staleStats');
    }
    if (input.unstableFormScore > 0.55) {
      flags.push('unstableForm');
    }
    if (input.weakMappingConfidence) {
      flags.push('weakMappingConfidence');
    }

    const isLowConfidence = input.finalConfidenceScore < 55 || flags.length >= 3 || flags.includes('lowDataQuality');
    const isRecommended = !isLowConfidence && input.finalConfidenceScore >= 65;
    const avoidReason = isLowConfidence ? this.resolveAvoidReason(flags, input.finalConfidenceScore) : null;

    return {
      riskFlags: [...new Set(flags)],
      isLowConfidence,
      isRecommended,
      avoidReason,
    };
  }

  private resolveAvoidReason(flags: string[], confidenceScore: number): string {
    if (flags.includes('lowDataQuality')) {
      return 'lowDataQuality';
    }
    if (flags.includes('highModelDisagreement')) {
      return 'highModelDisagreement';
    }
    if (flags.includes('weakMappingConfidence')) {
      return 'weakMappingConfidence';
    }
    if (confidenceScore < 45) {
      return 'veryLowConfidence';
    }
    return flags[0] || 'lowConfidence';
  }
}
