import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('returns low-confidence prediction list with pagination meta', async () => {
    const prismaMock = {
      prediction: {
        findMany: jest.fn().mockResolvedValue([
          {
            matchId: 'match-1',
            probabilities: { homeWin: 0.42, draw: 0.31, awayWin: 0.27 },
            expectedScore: { home: 1.2, away: 1.0 },
            confidenceScore: 49,
            summary: 'Dusuk guven',
            riskFlags: ['lowDataQuality'],
            updatedAt: new Date('2026-04-05T10:00:00.000Z'),
            isRecommended: false,
            isLowConfidence: true,
            avoidReason: 'lowDataQuality',
            match: {
              matchDate: new Date('2026-04-06T18:00:00.000Z'),
              status: 'SCHEDULED',
              sport: { code: 'FOOTBALL' },
              league: { id: 'league-1', name: 'Premier League' },
              homeTeam: { id: 'team-1', name: 'Arsenal', logoUrl: null },
              awayTeam: { id: 'team-2', name: 'Chelsea', logoUrl: null },
            },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;

    const service = new AdminService(
      prismaMock,
      {
        getLatestPredictionRuns: jest.fn(),
        getFailedPredictionJobs: jest.fn(),
        enqueuePredictionJob: jest.fn(),
      } as any,
      { rateLimitStatus: jest.fn() } as any,
      {
        failedPredictions: jest.fn(),
        failedPredictionDetail: jest.fn(),
      } as any,
    );

    const result = await service.lowConfidencePredictions(1, 20);

    expect(prismaMock.prediction.findMany).toHaveBeenCalled();
    expect(result.meta.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        matchId: 'match-1',
        confidenceScore: 49,
        isLowConfidence: true,
        avoidReason: 'lowDataQuality',
      }),
    );
  });
});
