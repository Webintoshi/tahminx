export interface SupportedLeagueConfig {
  sportCode: 'FOOTBALL' | 'BASKETBALL';
  providerCode: string;
  externalIds: string[];
  names: string[];
}

export const DEFAULT_SUPPORTED_LEAGUES: SupportedLeagueConfig[] = [
  {
    sportCode: 'FOOTBALL',
    providerCode: 'football_data',
    externalIds: ['TSL', 'PL', 'tur.1', 'eng.1'],
    names: ['Turkey Super Lig', 'Turkish Super Lig', 'Super Lig', 'England Premier League', 'Premier League'],
  },
  {
    sportCode: 'BASKETBALL',
    providerCode: 'ball_dont_lie',
    externalIds: ['nba'],
    names: ['NBA'],
  },
];
