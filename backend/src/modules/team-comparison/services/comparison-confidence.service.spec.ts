import { PredictionConfidenceService } from 'src/modules/predictions/calibration/prediction-confidence.service';
import { ComparisonConfidenceService } from './comparison-confidence.service';

describe('ComparisonConfidenceService', () => {
  const service = new ComparisonConfidenceService(new PredictionConfidenceService());

  it('builds a stable confidence summary', () => {
    const result = service.compute({
      homeProfile: {
        dataQuality: 0.82,
        dataCoverage: 0.9,
        mappingConfidence: 0.88,
        requestedWindow: 'last5',
        appliedWindow: 'last5',
        sampleSize: 5,
        riskFlags: [],
      } as any,
      awayProfile: {
        dataQuality: 0.76,
        dataCoverage: 0.84,
        mappingConfidence: 0.8,
        requestedWindow: 'last5',
        appliedWindow: 'last5',
        sampleSize: 5,
        riskFlags: ['proxy_xg_fallback'],
      } as any,
      comparison: {
        overallEdge: 14,
      } as any,
      scenario: {
        rawConfidence: 0.72,
        calibratedConfidence: 0.74,
        modelDisagreement: 0.08,
      } as any,
      crossLeague: false,
    });

    expect(result.band).toBe('medium');
    expect(result.score).toBeGreaterThan(0);
    expect(result.dataCoverage).toBeCloseTo(87, 0);
    expect(result.riskFlags).toContain('proxy_xg_fallback');
  });
});
