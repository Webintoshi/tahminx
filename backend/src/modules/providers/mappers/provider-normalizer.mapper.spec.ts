import { mapRawMatches, mapRawTeams } from './provider-normalizer.mapper';

describe('provider-normalizer.mapper', () => {
  it('maps teams correctly', () => {
    const result = mapRawTeams([{ id: 10, name: 'Arsenal', logo: 'x' }]);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe('10');
    expect(result[0].name).toBe('Arsenal');
  });

  it('maps matches correctly', () => {
    const result = mapRawMatches([
      {
        id: 1,
        competition: { code: 'PL' },
        home_team: { id: 20 },
        away_team: { id: 21 },
        utcDate: '2026-05-10T20:00:00.000Z',
        status: 'SCHEDULED',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].leagueExternalId).toBe('PL');
  });
});
