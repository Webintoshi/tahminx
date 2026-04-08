import { FootballEloEngine } from './football-elo.engine';

describe('FootballEloEngine', () => {
  it('raises home win probability for stronger home history', async () => {
    const completedRows = [
      { homeTeamId: 'home', awayTeamId: 'away', homeScore: 2, awayScore: 0 },
      { homeTeamId: 'home', awayTeamId: 'x', homeScore: 3, awayScore: 1 },
      { homeTeamId: 'y', awayTeamId: 'away', homeScore: 2, awayScore: 0 },
      { homeTeamId: 'z', awayTeamId: 'away', homeScore: 1, awayScore: 1 },
    ];

    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          leagueId: 'league-1',
          matchDate: new Date('2026-05-15T18:00:00.000Z'),
          homeTeamId: 'home',
          awayTeamId: 'away',
        }),
        findMany: jest
          .fn()
          .mockResolvedValueOnce(completedRows)
          .mockResolvedValueOnce([
            { homeTeamId: 'home', homeScore: 2, awayScore: 1 },
            { homeTeamId: 'other', homeScore: 1, awayScore: 1 },
          ])
          .mockResolvedValueOnce([
            { homeTeamId: 'away', homeScore: 1, awayScore: 2 },
            { homeTeamId: 'other', homeScore: 0, awayScore: 0 },
          ]),
      },
      teamRatingSnapshot: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const engine = new FootballEloEngine(prismaMock);
    const output = await engine.run({
      matchId: 'm1',
      sportCode: 'FOOTBALL',
      homeTeamId: 'home',
      awayTeamId: 'away',
    });

    expect(output.probabilities.homeWin).toBeGreaterThan(output.probabilities.awayWin);
    expect(output.expectedScore.home).toBeGreaterThan(0);
    expect(output.expectedScore.away).toBeGreaterThan(0);
  });

  it('prefers archive rating snapshots when available', async () => {
    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          leagueId: 'league-1',
          matchDate: new Date('2026-05-15T18:00:00.000Z'),
          homeTeamId: 'home',
          awayTeamId: 'away',
        }),
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ homeTeamId: 'home', homeScore: 2, awayScore: 0 }])
          .mockResolvedValueOnce([{ homeTeamId: 'away', homeScore: 1, awayScore: 1 }]),
      },
      teamRatingSnapshot: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ ratingValue: 1710 })
          .mockResolvedValueOnce({ ratingValue: 1490 }),
      },
    } as any;

    const engine = new FootballEloEngine(prismaMock);
    const output = await engine.run({
      matchId: 'm1',
      sportCode: 'FOOTBALL',
      homeTeamId: 'home',
      awayTeamId: 'away',
    });

    expect(output.probabilities.homeWin).toBeGreaterThan(0.5);
    expect(prismaMock.teamRatingSnapshot.findFirst).toHaveBeenCalledTimes(2);
  });
});
