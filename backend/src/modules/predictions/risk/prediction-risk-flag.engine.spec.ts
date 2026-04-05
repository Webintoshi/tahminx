import { PredictionRiskFlagEngine } from './prediction-risk-flag.engine';

describe('PredictionRiskFlagEngine', () => {
  const engine = new PredictionRiskFlagEngine();

  it('produces all configured risk flags when thresholds are breached', () => {
    const result = engine.evaluate({
      dataQualityScore: 0.3,
      modelDisagreement: 0.25,
      missingPlayersCount: 4,
      trainingSampleSize: 80,
      statsAgeHours: 120,
      unstableFormScore: 0.7,
      weakMappingConfidence: true,
      finalConfidenceScore: 50,
    });

    expect(result.riskFlags).toEqual(
      expect.arrayContaining([
        'lowDataQuality',
        'highModelDisagreement',
        'missingKeyPlayers',
        'lowSampleSize',
        'staleStats',
        'unstableForm',
        'weakMappingConfidence',
      ]),
    );
    expect(result.isLowConfidence).toBe(true);
    expect(result.isRecommended).toBe(false);
    expect(result.avoidReason).toBe('lowDataQuality');
  });

  it('keeps stable predictions recommended', () => {
    const result = engine.evaluate({
      dataQualityScore: 0.86,
      modelDisagreement: 0.05,
      missingPlayersCount: 0,
      trainingSampleSize: 400,
      statsAgeHours: 24,
      unstableFormScore: 0.2,
      weakMappingConfidence: false,
      finalConfidenceScore: 78,
    });

    expect(result.riskFlags).toHaveLength(0);
    expect(result.isLowConfidence).toBe(false);
    expect(result.isRecommended).toBe(true);
    expect(result.avoidReason).toBeNull();
  });
});
