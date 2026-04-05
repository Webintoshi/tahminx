import { FootballDataProviderAdapter } from './football-data.adapter';

class FootballDataClientMock {
  async getLeagues() {
    return {
      competitions: [
        { id: 2021, code: 'PL', name: 'Premier League', area: { name: 'England' } },
      ],
    };
  }

  async getCompetition() {
    return {
      currentSeason: { id: '2026', season: 2026, startDate: '2026-08-10', endDate: '2027-05-25', current: true },
    };
  }

  async getTeams() {
    return {
      teams: [{ id: 57, name: 'Arsenal', tla: 'ARS' }],
    };
  }

  async getMatches() {
    return {
      matches: [
        {
          id: 10,
          competition: { code: 'PL' },
          homeTeam: { id: 57 },
          awayTeam: { id: 61 },
          utcDate: '2026-05-10T20:00:00.000Z',
          status: 'SCHEDULED',
        },
      ],
    };
  }

  async getStandings() {
    return {
      standings: [
        {
          table: [
            {
              position: 1,
              team: { id: 57 },
              playedGames: 10,
              won: 8,
              draw: 1,
              lost: 1,
              goalsFor: 20,
              goalsAgainst: 8,
              points: 25,
            },
          ],
        },
      ],
    };
  }

  async getMatchById() {
    return { match: null };
  }
}

describe('FootballDataProviderAdapter', () => {
  it('normalizes leagues and standings', async () => {
    const adapter = new FootballDataProviderAdapter(new FootballDataClientMock() as never);

    const leagues = await adapter.getLeagues();
    const standings = await adapter.getStandings('PL');

    expect(leagues).toHaveLength(1);
    expect(leagues[0].externalId).toBe('PL');
    expect(standings[0].externalTeamId).toBe('57');
    expect(standings[0].points).toBe(25);
  });
});
