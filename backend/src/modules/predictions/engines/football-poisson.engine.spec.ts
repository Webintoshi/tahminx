import { FootballPoissonEngine } from './football-poisson.engine';

describe('FootballPoissonEngine', () => {
  it('returns stable probability distribution', async () => {
    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          matchDate: new Date('2026-05-10T20:00:00.000Z'),
          homeTeamId: 'h',
          awayTeamId: 'a',
        }),
        findMany: jest.fn().mockResolvedValue([
          { homeTeamId: 'h', homeScore: 2, awayScore: 1 },
          { homeTeamId: 'a', homeScore: 1, awayScore: 1 },
        ]),
      },
    } as any;

    const engine = new FootballPoissonEngine(prismaMock);
    const output = await engine.run({
      matchId: 'm1',
      sportCode: 'FOOTBALL',
      homeTeamId: 'h',
      awayTeamId: 'a',
    });

    const sum = output.probabilities.homeWin + output.probabilities.draw + output.probabilities.awayWin;
    expect(sum).toBeCloseTo(1, 2);
    expect(output.expectedScore.home).toBeGreaterThan(0);
  });
});
