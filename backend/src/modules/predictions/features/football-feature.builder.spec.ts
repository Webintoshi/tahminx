import { FootballFeatureBuilder } from './football-feature.builder';

describe('FootballFeatureBuilder', () => {
  it('builds required feature keys', async () => {
    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          leagueId: 'l1',
          seasonId: 's1',
          matchDate: new Date('2026-05-01T18:00:00.000Z'),
          homeTeamId: 'h1',
          awayTeamId: 'a1',
        }),
        findMany: jest.fn().mockResolvedValue([
          { homeTeamId: 'h1', awayTeamId: 'a1', homeScore: 2, awayScore: 1, matchDate: new Date('2026-04-20T18:00:00.000Z') },
          { homeTeamId: 'a1', awayTeamId: 'h1', homeScore: 0, awayScore: 1, matchDate: new Date('2026-04-10T18:00:00.000Z') },
        ]),
      },
      standingsSnapshot: {
        findFirst: jest.fn().mockResolvedValue({ rank: 2 }),
      },
      player: {
        findMany: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
      },
      playerStat: {
        findMany: jest.fn().mockResolvedValue([{ playerId: 'p1' }]),
      },
    } as any;

    const builder = new FootballFeatureBuilder(prismaMock);
    const features = await builder.build({
      matchId: 'm1',
      sportCode: 'FOOTBALL',
      homeTeamId: 'h1',
      awayTeamId: 'a1',
    });

    expect(features).toMatchObject({
      recentFormScore: expect.any(Number),
      homeAwayStrength: expect.any(Number),
      avgGoalsFor: expect.any(Number),
      avgGoalsAgainst: expect.any(Number),
      tableRank: expect.any(Number),
      opponentStrengthDiff: expect.any(Number),
      restDays: expect.any(Number),
      missingPlayersCount: expect.any(Number),
    });
  });
});
