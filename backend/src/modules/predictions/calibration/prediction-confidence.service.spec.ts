import { PredictionConfidenceService } from './prediction-confidence.service';

describe('PredictionConfidenceService', () => {
  const service = new PredictionConfidenceService();

  it('normalizes final confidence between 0 and 100', () => {
    const result = service.compute({
      rawConfidence: 1.5,
      calibratedConfidence: 1.2,
      sampleSize: 1000,
      dataQualityScore: 1.3,
      modelDisagreement: 0,
      missingPlayersCount: 0,
      riskFlags: [],
    });

    expect(result.rawConfidenceScore).toBe(100);
    expect(result.calibratedConfidenceScore).toBe(100);
    expect(result.finalConfidenceScore).toBeLessThanOrEqual(100);
    expect(result.finalConfidenceScore).toBeGreaterThanOrEqual(0);
  });

  it('reduces final confidence with disagreement, missing players and risk flags', () => {
    const base = service.compute({
      rawConfidence: 0.72,
      calibratedConfidence: 0.7,
      sampleSize: 300,
      dataQualityScore: 0.9,
      modelDisagreement: 0.02,
      missingPlayersCount: 0,
      riskFlags: [],
    });

    const penalized = service.compute({
      rawConfidence: 0.72,
      calibratedConfidence: 0.7,
      sampleSize: 40,
      dataQualityScore: 0.5,
      modelDisagreement: 0.22,
      missingPlayersCount: 4,
      riskFlags: ['lowDataQuality', 'highModelDisagreement', 'missingKeyPlayers'],
    });

    expect(penalized.finalConfidenceScore).toBeLessThan(base.finalConfidenceScore);
    expect(penalized.finalConfidenceScore).toBeGreaterThanOrEqual(0);
  });
});
