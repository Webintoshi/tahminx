import { FeatureLabService } from './feature-lab.service';

describe('FeatureLabService', () => {
  it('runs feature experiment and stores metrics', async () => {
    const prismaMock = {
      featureLabSet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'fs1',
          sport: 'FOOTBALL',
          enabledFeatures: ['recentFormScore', 'tableRank'],
        }),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      modelVersion: {
        findUnique: jest.fn().mockResolvedValue({ id: 'mv1', deletedAt: null }),
      },
      prediction: {
        findMany: jest.fn().mockResolvedValue([
          {
            confidenceScore: 78,
            probabilities: { homeWin: 0.6, draw: 0.2, awayWin: 0.2 },
            explanation: { explanation: { features: { recentFormScore: 0.7, tableRank: 0.5 } } },
            match: { homeScore: 2, awayScore: 1, sport: { code: 'FOOTBALL' } },
          },
          {
            confidenceScore: 70,
            probabilities: { homeWin: 0.35, draw: 0.3, awayWin: 0.35 },
            explanation: { explanation: { features: { recentFormScore: 0.3, tableRank: 0.8 } } },
            match: { homeScore: 0, awayScore: 1, sport: { code: 'FOOTBALL' } },
          },
        ]),
      },
      featureLabExperiment: {
        create: jest.fn().mockResolvedValue({
          id: 'exp1',
          featureSetId: 'fs1',
          modelVersionId: 'mv1',
          sport: 'FOOTBALL',
          leagueId: null,
          predictionType: 'matchOutcome',
          fromDate: new Date('2026-03-01T00:00:00.000Z'),
          toDate: new Date('2026-04-05T00:00:00.000Z'),
          status: 'COMPLETED',
          sampleSize: 2,
          metrics: { accuracy: 1 },
          updatedAt: new Date('2026-04-05T00:00:00.000Z'),
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit1' }),
      },
    } as any;

    const service = new FeatureLabService(prismaMock);
    const result = await service.runExperiment({
      featureSetId: 'fs1',
      modelVersionId: 'mv1',
      predictionType: 'matchOutcome',
    });

    expect(result.data.id).toBe('exp1');
    expect(prismaMock.featureLabExperiment.create).toHaveBeenCalled();
  });

  it('returns active feature set for sport', async () => {
    const prismaMock = {
      featureLabSet: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'fs-active',
          sport: 'FOOTBALL',
          enabledFeatures: ['recentFormScore'],
        }),
        create: jest.fn(),
      },
    } as any;

    const service = new FeatureLabService(prismaMock);
    const active = await service.activeFeatureSetForSport('FOOTBALL');

    expect(active.id).toBe('fs-active');
  });
});
