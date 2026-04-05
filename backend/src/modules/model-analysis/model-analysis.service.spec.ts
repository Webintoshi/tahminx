import { ModelAnalysisService } from './model-analysis.service';

describe('ModelAnalysisService', () => {
  const basePredictionRows = [
    {
      id: 'p1',
      modelVersionId: 'mv1',
      confidenceScore: 82,
      probabilities: { homeWin: 0.7, draw: 0.2, awayWin: 0.1 },
      riskFlags: ['highModelDisagreement'],
      modelVersion: { key: 'm1', name: 'Model 1' },
      explanation: { explanation: { features: { recentFormScore: 0.8, tableRank: 0.5 } } },
      match: {
        id: 'm1',
        leagueId: 'l1',
        league: { id: 'l1', name: 'Premier League' },
        sport: { code: 'FOOTBALL' },
        matchDate: new Date('2026-04-01T12:00:00.000Z'),
        homeScore: 1,
        awayScore: 0,
      },
    },
    {
      id: 'p2',
      modelVersionId: 'mv1',
      confidenceScore: 78,
      probabilities: { homeWin: 0.62, draw: 0.25, awayWin: 0.13 },
      riskFlags: ['staleStats', 'missingKeyPlayers'],
      modelVersion: { key: 'm1', name: 'Model 1' },
      explanation: { explanation: { features: { recentFormScore: 0.6, avgGoalsFor: 0.4 } } },
      match: {
        id: 'm2',
        leagueId: 'l1',
        league: { id: 'l1', name: 'Premier League' },
        sport: { code: 'FOOTBALL' },
        matchDate: new Date('2026-04-02T12:00:00.000Z'),
        homeScore: 0,
        awayScore: 2,
      },
    },
    {
      id: 'p3',
      modelVersionId: 'mv2',
      confidenceScore: 66,
      probabilities: { homeWin: 0.41, draw: 0.3, awayWin: 0.29 },
      riskFlags: ['lowDataQuality', 'weakMappingConfidence'],
      modelVersion: { key: 'm2', name: 'Model 2' },
      explanation: { explanation: { features: { pace: 0.7, turnoverRate: 0.5 } } },
      match: {
        id: 'm3',
        leagueId: 'l2',
        league: { id: 'l2', name: 'Super Lig' },
        sport: { code: 'FOOTBALL' },
        matchDate: new Date('2026-04-03T12:00:00.000Z'),
        homeScore: 1,
        awayScore: 1,
      },
    },
  ];

  const buildService = () => {
    const prismaMock = {
      prediction: {
        findMany: jest.fn().mockResolvedValue(basePredictionRows),
      },
      modelComparisonSnapshot: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      modelPerformanceTimeseries: {
        upsert: jest.fn().mockResolvedValue({ id: 'ts-1' }),
      },
      featureImportanceSnapshot: {
        upsert: jest.fn().mockResolvedValue({ id: 'fi-1' }),
      },
      failedPredictionAnalysis: {
        upsert: jest.fn().mockResolvedValue({ id: 'fa-1' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'fa-1',
            predictionId: 'p2',
            modelVersionId: 'mv1',
            matchId: 'm2',
            sport: 'FOOTBALL',
            confidenceScore: 78,
            isHighConfidence: true,
            predictedOutcome: 'homeWin',
            actualOutcome: 'awayWin',
            reasonFlags: ['staleStatsImpact'],
            impacts: { staleStatsImpact: 1 },
            summary: 'summary',
            updatedAt: new Date('2026-04-05T00:00:00.000Z'),
            modelVersion: { key: 'm1', name: 'Model 1' },
            match: {
              league: { id: 'l1', name: 'Premier League' },
              homeTeam: { id: 't1', name: 'A', logoUrl: null },
              awayTeam: { id: 't2', name: 'B', logoUrl: null },
              matchDate: new Date('2026-04-02T12:00:00.000Z'),
            },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({
          id: 'fa-1',
          predictionId: 'p2',
          modelVersionId: 'mv1',
          matchId: 'm2',
          sport: 'FOOTBALL',
          confidenceScore: 78,
          isHighConfidence: true,
          predictedOutcome: 'homeWin',
          actualOutcome: 'awayWin',
          reasonFlags: ['staleStatsImpact'],
          impacts: { staleStatsImpact: 1 },
          summary: 'summary',
          updatedAt: new Date('2026-04-05T00:00:00.000Z'),
          modelVersion: { key: 'm1', name: 'Model 1' },
          prediction: { explanation: { explanation: { features: { recentFormScore: 0.6 } } } },
          match: {
            league: { id: 'l1', name: 'Premier League' },
            sport: { code: 'FOOTBALL' },
            homeTeam: { id: 't1', name: 'A', logoUrl: null },
            awayTeam: { id: 't2', name: 'B', logoUrl: null },
            matchDate: new Date('2026-04-02T12:00:00.000Z'),
            events: [],
          },
        }),
      },
    } as any;

    return { service: new ModelAnalysisService(prismaMock), prismaMock };
  };

  it('builds model comparison metrics and persists snapshot', async () => {
    const { service, prismaMock } = buildService();

    const result = await service.modelComparison({ page: 1, pageSize: 20, sport: 'football' });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toEqual(expect.objectContaining({ accuracy: expect.any(Number), sampleSize: expect.any(Number) }));
    expect(prismaMock.modelComparisonSnapshot.createMany).toHaveBeenCalled();
  });

  it('generates feature importance and stores normalized scores', async () => {
    const { service, prismaMock } = buildService();

    const result = await service.featureImportance({ limit: 5, lookbackDays: 30 });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toEqual(expect.objectContaining({ featureName: expect.any(String), importanceScore: expect.any(Number) }));
    expect(prismaMock.featureImportanceSnapshot.upsert).toHaveBeenCalled();
  });

  it('returns failed prediction list after analysis refresh', async () => {
    const { service, prismaMock } = buildService();

    const result = await service.failedPredictions({ page: 1, pageSize: 20, highConfidenceOnly: 'true' });

    expect(result.data.length).toBe(1);
    expect(result.data[0].isHighConfidence).toBe(true);
    expect(prismaMock.failedPredictionAnalysis.upsert).toHaveBeenCalled();
  });

  it('computes drift summary flags', async () => {
    const { service } = buildService();

    const result = await service.driftSummary({ sport: 'football' });

    expect(result.data).toEqual(
      expect.objectContaining({
        performanceDropDetected: expect.any(Boolean),
        confidenceDriftDetected: expect.any(Boolean),
        calibrationDriftDetected: expect.any(Boolean),
      }),
    );
  });
});
