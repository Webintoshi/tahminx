export interface ProviderPolicy {
  code: string;
  requiredApiKey: boolean;
  defaultActive: boolean;
  primary: boolean;
  envKey: string;
  rateLimitPerMinute: number;
}

export const PROVIDER_POLICIES: ProviderPolicy[] = [
  {
    code: 'football_data',
    requiredApiKey: false,
    defaultActive: true,
    primary: true,
    envKey: 'FOOTBALL_DATA_API_KEY',
    rateLimitPerMinute: 60,
  },
  {
    code: 'ball_dont_lie',
    requiredApiKey: false,
    defaultActive: true,
    primary: true,
    envKey: 'BALL_DONT_LIE_API_KEY',
    rateLimitPerMinute: 600,
  },
  {
    code: 'api_football',
    requiredApiKey: true,
    defaultActive: false,
    primary: false,
    envKey: 'API_FOOTBALL_API_KEY',
    rateLimitPerMinute: 120,
  },
  {
    code: 'the_sports_db',
    requiredApiKey: false,
    defaultActive: false,
    primary: false,
    envKey: 'THE_SPORTS_DB_API_KEY',
    rateLimitPerMinute: 300,
  },
];

export const PROVIDER_CODE_TO_SPORT: Record<string, 'FOOTBALL' | 'BASKETBALL'> = {
  football_data: 'FOOTBALL',
  api_football: 'FOOTBALL',
  the_sports_db: 'FOOTBALL',
  ball_dont_lie: 'BASKETBALL',
};
