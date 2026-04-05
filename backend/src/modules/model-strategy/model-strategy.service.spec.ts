import { ModelStrategyService } from './model-strategy.service';

describe('ModelStrategyService', () => {
  it('resolves active league strategy before sport fallback', async () => {
    const prismaMock = {
      modelStrategy: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 's1',
            sport: 'FOOTBALL',
            leagueId: 'l1',
            predictionType: 'matchOutcome',
            primaryModelVersionId: 'mv1',
            fallbackModelVersionId: 'mv2',
            calibrationProfileId: null,
            ensembleConfig: {
              method: 'weightedAverage',
              members: [
                { model: 'elo', weight: 0.6 },
                { model: 'poisson', weight: 0.4 },
              ],
            },
            isActive: true,
          })
          .mockResolvedValueOnce(null),
      },
      modelVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    } as any;

    const service = new ModelStrategyService(prismaMock);
    const strategy = await service.resolveForMatch({
      sportCode: 'FOOTBALL',
      sportId: 'sport-1',
      leagueId: 'l1',
      predictionType: 'matchOutcome',
    });

    expect(strategy.id).toBe('s1');
    expect(strategy.primaryModelVersionId).toBe('mv1');
    expect(strategy.ensembleConfig.members[0].model).toBe('elo');
  });

  it('auto-select chooses best candidate and persists strategy', async () => {
    const predictionRows = [
      {
        modelVersionId: 'mv1',
        confidenceScore: 78,
        probabilities: { homeWin: 0.62, draw: 0.22, awayWin: 0.16 },
        modelVersion: { key: 'elo-poisson-v1' },
        match: {
          leagueId: 'l1',
          homeScore: 2,
          awayScore: 1,
          sport: { code: 'FOOTBALL' },
        },
      },
      {
        modelVersionId: 'mv2',
        confidenceScore: 64,
        probabilities: { homeWin: 0.4, draw: 0.3, awayWin: 0.3 },
        modelVersion: { key: 'baseline-v1' },
        match: {
          leagueId: 'l1',
          homeScore: 0,
          awayScore: 1,
          sport: { code: 'FOOTBALL' },
        },
      },
    ];

    const prismaMock = {
      prediction: {
        findMany: jest.fn().mockResolvedValue(predictionRows),
      },
      backtestResult: {
        findFirst: jest.fn().mockResolvedValue({ accuracy: 0.59, calibrationCurve: [] }),
      },
      modelComparisonSnapshot: {
        findFirst: jest.fn().mockResolvedValue({ accuracy: 0.61, calibrationQuality: 0.82 }),
      },
      modelStrategy: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'strategy-1' }),
      },
      predictionCalibration: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      modelVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    const service = new ModelStrategyService(prismaMock);
    const result = await service.autoSelect({ predictionType: 'matchOutcome', minSampleSize: 10, lookbackDays: 60 }, 'admin-1');

    expect(result.data.length).toBeGreaterThan(0);
    expect(prismaMock.modelStrategy.create).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it('normalizes ensemble config update', async () => {
    const prismaMock = {
      modelStrategy: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', sport: 'FOOTBALL' }),
        update: jest.fn().mockResolvedValue({
          id: 's1',
          sport: 'FOOTBALL',
          leagueId: 'l1',
          predictionType: 'matchOutcome',
          ensembleConfig: {
            method: 'weightedAverage',
            members: [
              { model: 'elo', weight: 0.7 },
              { model: 'poisson', weight: 0.3 },
            ],
          },
          updatedAt: new Date('2026-04-05T00:00:00.000Z'),
        }),
      },
    } as any;

    const service = new ModelStrategyService(prismaMock);
    const result = await service.updateEnsembleConfig('s1', {
      ensembleConfig: {
        members: [
          { model: 'elo', weight: 7 },
          { model: 'poisson', weight: 3 },
        ],
      },
    });

    expect(result.data.ensembleConfig.members[0].weight + result.data.ensembleConfig.members[1].weight).toBeCloseTo(1, 4);
  });
});
