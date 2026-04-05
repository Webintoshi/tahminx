import { BallDontLieProviderAdapter } from './ball-dont-lie.adapter';

class BallDontLieClientMock {
  async getTeams() {
    return {
      data: [
        { id: 14, full_name: 'Los Angeles Lakers', abbreviation: 'LAL' },
        { id: 2, full_name: 'Boston Celtics', abbreviation: 'BOS' },
      ],
    };
  }

  async getPlayers() {
    return {
      data: [{ id: 1, first_name: 'LeBron', last_name: 'James', team_id: 14 }],
    };
  }

  async getGames() {
    return {
      data: [
        {
          id: 1,
          season: 2026,
          home_team: { id: 14 },
          visitor_team: { id: 2 },
          home_team_score: 110,
          visitor_team_score: 100,
          status: 'Final',
          date: '2026-03-12T19:00:00.000Z',
        },
      ],
    };
  }

  async getGameById() {
    return {
      id: 1,
      season: 2026,
      home_team: { id: 14 },
      visitor_team: { id: 2 },
      home_team_score: 108,
      visitor_team_score: 104,
      status: 'Final',
      date: '2026-03-12T19:00:00.000Z',
    };
  }

  async getGameStats() {
    return { data: [] };
  }
}

describe('BallDontLieProviderAdapter', () => {
  it('returns standings from games aggregation', async () => {
    const adapter = new BallDontLieProviderAdapter(new BallDontLieClientMock() as never);

    const standings = await adapter.getStandings('nba', '2026');

    expect(standings.length).toBeGreaterThan(0);
    expect(standings[0].externalTeamId).toBe('14');
    expect(standings[0].rank).toBe(1);
  });
});
