import { Injectable } from '@nestjs/common';
import { PredictionConfidenceService } from 'src/modules/predictions/calibration/prediction-confidence.service';
import {
  AggregatedTeamProfile,
  ComparisonEngineResult,
  ScenarioEngineResult,
} from '../team-comparison.types';

@Injectable()
export class ComparisonConfidenceService {
  constructor(private readonly predictionConfidenceService: PredictionConfidenceService) {}

  compute(input: {
    homeProfile: AggregatedTeamProfile;
    awayProfile: AggregatedTeamProfile;
    comparison: ComparisonEngineResult;
    scenario: ScenarioEngineResult;
    crossLeague: boolean;
  }) {
    const dataQuality = average([input.homeProfile.dataQuality, input.awayProfile.dataQuality]);
    const dataCoverage = average([input.homeProfile.dataCoverage, input.awayProfile.dataCoverage]);
    const mappingConfidence = average([input.homeProfile.mappingConfidence, input.awayProfile.mappingConfidence]);
    const windowConsistency =
      input.homeProfile.requestedWindow === input.homeProfile.appliedWindow &&
      input.awayProfile.requestedWindow === input.awayProfile.appliedWindow
        ? 1
        : 0.72;

    const riskFlags = [
      ...new Set([
        ...input.homeProfile.riskFlags,
        ...input.awayProfile.riskFlags,
        ...(input.crossLeague ? ['cross_league_context'] : []),
        ...(Math.abs(input.comparison.overallEdge) < 8 ? ['balanced_matchup'] : []),
      ]),
    ];

    const confidence = this.predictionConfidenceService.compute({
      rawConfidence: input.scenario.rawConfidence,
      calibratedConfidence: input.scenario.calibratedConfidence,
      sampleSize: input.homeProfile.sampleSize + input.awayProfile.sampleSize,
      dataQualityScore: average([dataQuality, dataCoverage, mappingConfidence, windowConsistency]),
      modelDisagreement: input.scenario.modelDisagreement,
      missingPlayersCount: 0,
      riskFlags,
    });

    return {
      score: confidence.finalConfidenceScore,
      band: band(confidence.finalConfidenceScore),
      rawScore: confidence.rawConfidenceScore,
      calibratedScore: confidence.calibratedConfidenceScore,
      dataQuality: round2(dataQuality * 100),
      dataCoverage: round2(dataCoverage * 100),
      comparisonDataCoverage: round2(dataCoverage * 100),
      windowConsistency: round2(windowConsistency * 100),
      mappingConfidence: round2(mappingConfidence * 100),
      modelConsensus: round2((1 - input.scenario.modelDisagreement) * 100),
      riskFlags,
    };
  }
}

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const round2 = (value: number) => Number(value.toFixed(2));
const band = (score: number) => {
  if (score >= 75) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
};
