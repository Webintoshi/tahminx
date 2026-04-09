import { PredictionsService } from './predictions.service';

const cacheMock = {
  getOrSet: jest.fn().mockImplementation(async (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  delByPrefix: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('PredictionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates feature snapshot for a match', async () => {
    const repositoryMock = {
      list: jest.fn(),
      getByMatchId: jest.fn(),
      upsertPrediction: jest.fn(),
      upsertFeatureSet: jest.fn().mockResolvedValue({ id: 'fs-1' }),
    };

    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          sportId: 's1',
          sport: { code: 'FOOTBALL' },
          homeTeamId: 'h1',
          awayTeamId: 'a1',
          leagueId: 'l1',
          seasonId: 'ss1',
        }),
      },
      featureSet: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
      },
      modelVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      prediction: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    const service = new PredictionsService(
      repositoryMock as any,
      prismaMock,
      cacheMock as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { build: jest.fn().mockResolvedValue({ recentFormScore: 0.3, homeAwayStrength: 0.1 }) } as any,
      { build: jest.fn() } as any,
      { score: jest.fn() } as any,
      { compute: jest.fn() } as any,
      { evaluate: jest.fn() } as any,
      { build: jest.fn() } as any,
      { calibrateProbabilities: jest.fn() } as any,
      { resolveForMatch: jest.fn() } as any,
      {
        activeFeatureSetForSport: jest.fn().mockResolvedValue({
          id: 'fs-default',
          enabledFeatures: ['recentFormScore', 'homeAwayStrength'],
        }),
      } as any,
    );

    const result = await service.generateFeaturesForMatch('m1');

    expect(result.matchId).toBe('m1');
    expect(result.featureSetId).toBe('fs-default');
    expect(repositoryMock.upsertFeatureSet).toHaveBeenCalled();
  });

  it('generates calibrated prediction with strategy metadata', async () => {
    const repositoryMock = {
      list: jest.fn(),
      getByMatchId: jest.fn().mockResolvedValue({
        match: {
          id: 'm1',
          sport: { code: 'FOOTBALL' },
          league: { id: 'l1', name: 'Premier League' },
          homeTeam: { id: 'h1', name: 'Arsenal', logoUrl: null },
          awayTeam: { id: 'a1', name: 'Chelsea', logoUrl: null },
          matchDate: new Date('2026-05-10T20:00:00.000Z'),
          status: 'SCHEDULED',
        },
        probabilities: { homeWin: 0.5, draw: 0.25, awayWin: 0.25 },
        expectedScore: { home: 1.7, away: 1.1 },
        confidenceScore: 77,
        summary: 'summary',
        riskFlags: ['lowDataQuality'],
        isRecommended: false,
        isLowConfidence: true,
        avoidReason: 'lowDataQuality',
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
      }),
      upsertPrediction: jest.fn().mockResolvedValue({ id: 'p1' }),
      upsertFeatureSet: jest.fn().mockResolvedValue({ id: 'f1' }),
    };

    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          sportId: 's1',
          sport: { code: 'FOOTBALL' },
          league: { id: 'l1', name: 'Premier League' },
          homeTeam: { id: 'h1', name: 'Arsenal', logoUrl: null },
          awayTeam: { id: 'a1', name: 'Chelsea', logoUrl: null },
          homeTeamId: 'h1',
          awayTeamId: 'a1',
          leagueId: 'l1',
          seasonId: 'ss1',
          matchDate: new Date('2026-05-10T20:00:00.000Z'),
        }),
        findFirst: jest.fn().mockResolvedValue({
          matchDate: new Date('2026-05-08T20:00:00.000Z'),
        }),
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { homeTeamId: 'h1', homeScore: 2, awayScore: 1 },
            { homeTeamId: 'x1', homeScore: 0, awayScore: 1 },
          ])
          .mockResolvedValueOnce([
            { homeTeamId: 'a1', homeScore: 1, awayScore: 1 },
            { homeTeamId: 'x2', homeScore: 2, awayScore: 0 },
          ]),
      },
      featureSet: {
        findUnique: jest.fn().mockResolvedValue({
          matchId: 'm1',
          modelFamily: 'football-features-v1',
          features: { recentFormScore: 0.4, homeAwayStrength: 0.2, missingPlayersCount: 1 },
          qualityScore: 0.75,
        }),
        findFirst: jest.fn(),
      },
      modelVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'mv1', key: 'football-hybrid-v1' }),
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'mv1', key: 'football-hybrid-v1', name: 'M1', version: '1.0.0' }),
      },
      providerMatchMapping: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      providerTeamMapping: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      prediction: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([[], []]),
    } as any;

    const footballElo = {
      run: jest.fn().mockResolvedValue({
        probabilities: { homeWin: 0.6, draw: 0.2, awayWin: 0.2 },
        expectedScore: { home: 1.8, away: 1.1 },
      }),
    };
    const footballPoisson = {
      run: jest.fn().mockResolvedValue({
        probabilities: { homeWin: 0.5, draw: 0.25, awayWin: 0.25 },
        expectedScore: { home: 1.6, away: 1.0 },
      }),
    };
    const confidenceCalculator = { score: jest.fn().mockReturnValue(77) };
    const confidenceService = {
      compute: jest
        .fn()
        .mockReturnValueOnce({
          rawConfidenceScore: 77,
          calibratedConfidenceScore: 74,
          finalConfidenceScore: 68,
        })
        .mockReturnValueOnce({
          rawConfidenceScore: 77,
          calibratedConfidenceScore: 74,
          finalConfidenceScore: 63,
        }),
    };
    const riskEngine = {
      evaluate: jest
        .fn()
        .mockReturnValueOnce({
          riskFlags: ['lowDataQuality'],
          isLowConfidence: true,
          isRecommended: false,
          avoidReason: 'lowDataQuality',
        })
        .mockReturnValueOnce({
          riskFlags: ['lowDataQuality', 'weakMappingConfidence'],
          isLowConfidence: true,
          isRecommended: false,
          avoidReason: 'lowDataQuality',
        }),
    };
    const explanation = { build: jest.fn().mockReturnValue({ summary: 'home edge', riskFlags: ['staleStats'] }) };
    const calibration = {
      calibrateProbabilities: jest.fn().mockResolvedValue({
        probabilities: { homeWin: 0.55, draw: 0.24, awayWin: 0.21 },
        calibratedConfidence: 0.74,
        calibrationApplied: true,
        calibrationId: 'cal-1',
        trainingSampleSize: 180,
      }),
    };

    const service = new PredictionsService(
      repositoryMock as any,
      prismaMock,
      cacheMock as any,
      footballElo as any,
      footballPoisson as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { build: jest.fn() } as any,
      { build: jest.fn() } as any,
      confidenceCalculator as any,
      confidenceService as any,
      riskEngine as any,
      explanation as any,
      calibration as any,
      {
        resolveForMatch: jest.fn().mockResolvedValue({
          id: 'strategy-1',
          sport: 'FOOTBALL',
          leagueId: 'l1',
          predictionType: 'matchOutcome',
          primaryModelVersionId: 'mv1',
          fallbackModelVersionId: null,
          calibrationProfileId: null,
          ensembleConfig: {
            method: 'weightedAverage',
            members: [
              { model: 'elo', weight: 0.5 },
              { model: 'poisson', weight: 0.5 },
            ],
          },
          source: 'strategy',
        }),
      } as any,
      {
        activeFeatureSetForSport: jest.fn().mockResolvedValue({
          id: 'fs-default',
          enabledFeatures: [],
        }),
      } as any,
    );

    await service.generateForMatch('m1');

    expect(repositoryMock.upsertPrediction).toHaveBeenCalledWith(
      'm1',
      'mv1',
      expect.objectContaining({
        probabilities: { homeWin: 0.55, draw: 0.24, awayWin: 0.21 },
        confidenceScore: 63,
        isLowConfidence: true,
        avoidReason: 'lowDataQuality',
        modelStrategyId: 'strategy-1',
      }),
    );
    expect(cacheMock.delByPrefix).toHaveBeenCalledWith('predictions:');
  });
});
