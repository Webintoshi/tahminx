import { BacktestService } from './backtest.service';
import { BacktestResultsQueryDto } from './dto/backtest-results-query.dto';
import { RunBacktestDto } from './dto/run-backtest.dto';

describe('BacktestService', () => {
  it('runs backtest and stores aggregate metrics', async () => {
    const prismaMock = {
      modelVersion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'mv1',
          sportId: 'sport-1',
          key: 'football-hybrid-v1',
          name: 'Football Hybrid',
          version: '1.0.0',
          deletedAt: null,
        }),
      },
      league: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'league-1',
          sportId: 'sport-1',
          name: 'Premier League',
          slug: 'england-premier-league',
        }),
      },
      match: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            matchDate: new Date('2025-01-10T18:00:00.000Z'),
            homeScore: 2,
            awayScore: 1,
            leagueId: 'league-1',
            season: { name: '2024/25', seasonYear: 2024 },
          },
          {
            id: 'm2',
            matchDate: new Date('2025-01-17T18:00:00.000Z'),
            homeScore: 0,
            awayScore: 1,
            leagueId: 'league-1',
            season: { name: '2024/25', seasonYear: 2024 },
          },
        ]),
      },
      backtestResult: {
        create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'bt-1',
          createdAt: new Date('2026-04-05T12:00:00.000Z'),
          updatedAt: new Date('2026-04-05T12:00:00.000Z'),
          ...data,
          modelVersion: {
            id: 'mv1',
            key: 'football-hybrid-v1',
            name: 'Football Hybrid',
            version: '1.0.0',
          },
          league: {
            id: 'league-1',
            name: 'Premier League',
            slug: 'england-premier-league',
          },
        })),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    const predictionsServiceMock = {
      previewForMatch: jest
        .fn()
        .mockResolvedValueOnce({
          modelVersionId: 'mv1',
          probabilities: { homeWin: 0.7, draw: 0.2, awayWin: 0.1 },
          expectedScore: { home: 2, away: 1 },
          confidenceScore: 82,
          summary: 'home edge',
          riskFlags: [],
          updatedAt: '2026-04-05T12:00:00.000Z',
        })
        .mockResolvedValueOnce({
          modelVersionId: 'mv1',
          probabilities: { homeWin: 0.6, draw: 0.2, awayWin: 0.2 },
          expectedScore: { home: 1.4, away: 1.2 },
          confidenceScore: 71,
          summary: 'home lean',
          riskFlags: ['low-confidence'],
          updatedAt: '2026-04-05T12:00:00.000Z',
        }),
    } as any;

    const service = new BacktestService(prismaMock, predictionsServiceMock);

    const dto = Object.assign(new RunBacktestDto(), {
      modelVersionId: 'mv1',
      leagueId: 'league-1',
      from: '2025-01-01T00:00:00.000Z',
      to: '2025-12-31T23:59:59.999Z',
      sampleLimit: 100,
    });

    const result = await service.run(dto, 'admin-user');

    expect(result.sampleSize).toBe(2);
    expect(result.accuracy).toBeCloseTo(0.5, 4);
    expect(result.logLoss).toBeCloseTo(0.9831, 4);
    expect(result.brierScore).toBeCloseTo(0.1967, 4);
    expect(prismaMock.backtestResult.create).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it('lists stored backtest results with pagination meta', async () => {
    const prismaMock = {
      backtestResult: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'bt-1',
            modelVersionId: 'mv1',
            leagueId: 'league-1',
            season: '2024/25',
            fromDate: new Date('2025-01-01T00:00:00.000Z'),
            toDate: new Date('2025-03-01T00:00:00.000Z'),
            accuracy: 0.61,
            logLoss: 0.89,
            brierScore: 0.18,
            sampleSize: 64,
            calibrationCurve: [{ bucket: '60-69', sampleSize: 12, avgConfidence: 0.66, actualAccuracy: 0.58 }],
            comparison: { correctPredictions: 39, wrongPredictions: 25 },
            createdAt: new Date('2026-04-05T12:00:00.000Z'),
            updatedAt: new Date('2026-04-05T12:00:00.000Z'),
            modelVersion: { id: 'mv1', key: 'football-hybrid-v1', name: 'Football Hybrid', version: '1.0.0' },
            league: { id: 'league-1', name: 'Premier League', slug: 'england-premier-league' },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;

    const service = new BacktestService(prismaMock, {} as any);
    const query = Object.assign(new BacktestResultsQueryDto(), { page: 1, pageSize: 20 });

    const result = await service.results(query);

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });
});
