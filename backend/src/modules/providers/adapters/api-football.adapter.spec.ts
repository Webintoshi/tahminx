import { ApiFootballProviderAdapter } from './api-football.adapter';

class ApiFootballClientMock {
  async getLeagues() {
    return { response: [{ league: { id: 39, name: 'Premier League' } }] };
  }

  async getTeams() {
    return { response: [{ team: { id: 50, name: 'Arsenal' } }] };
  }

  async getFixtures() {
    return { response: [] };
  }

  async getFixtureById() {
    return { response: [] };
  }

  async getStandings() {
    return { response: [{ league: { standings: [[]] } }] };
  }
}

describe('ApiFootballProviderAdapter', () => {
  it('normalizes league list', async () => {
    const adapter = new ApiFootballProviderAdapter(new ApiFootballClientMock() as never);
    const leagues = await adapter.getLeagues();
    expect(leagues[0].externalId).toBe('39');
    expect(leagues[0].name).toBe('Premier League');
  });
});
