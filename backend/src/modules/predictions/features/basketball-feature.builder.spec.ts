import { BasketballFeatureBuilder } from './basketball-feature.builder';

describe('BasketballFeatureBuilder', () => {
  it('builds required basketball feature keys', async () => {
    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          matchDate: new Date('2026-05-10T18:00:00.000Z'),
          homeTeamId: 'home-team',
          awayTeamId: 'away-team',
        }),
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              homeTeamId: 'home-team',
              homeScore: 115,
              awayScore: 109,
              matchDate: new Date('2026-05-01T18:00:00.000Z'),
            },
          ])
          .mockResolvedValueOnce([
            {
              homeTeamId: 'away-team',
              homeScore: 104,
              awayScore: 108,
              matchDate: new Date('2026-05-02T18:00:00.000Z'),
            },
          ]),
      },
      teamStat: {
        findMany: jest.fn().mockResolvedValue([
          {
            payload: {
              pace: 100.2,
              reboundRate: 52.4,
              turnoverRate: 11.8,
            },
            shots: 88,
          },
        ]),
      },
    } as any;

    const builder = new BasketballFeatureBuilder(prismaMock);
    const features = await builder.build({
      matchId: 'm1',
      sportCode: 'BASKETBALL',
      homeTeamId: 'home-team',
      awayTeamId: 'away-team',
    });

    expect(features).toMatchObject({
      recentFormScore: expect.any(Number),
      offensiveRating: expect.any(Number),
      defensiveRating: expect.any(Number),
      pace: expect.any(Number),
      reboundRate: expect.any(Number),
      turnoverRate: expect.any(Number),
      restDays: expect.any(Number),
      homeAdvantageScore: expect.any(Number),
    });
  });
});
