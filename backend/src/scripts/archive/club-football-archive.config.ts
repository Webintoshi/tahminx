export type ArchiveDivisionConfig = {
  code: string;
  countryCode: string;
  countryName: string;
  leagueName: string;
  leagueSlug: string;
  tier: number;
  calendarSeason: boolean;
};

export const ARCHIVE_PROVIDER_CODE = 'club_football_archive';
export const ARCHIVE_PROVIDER_NAME = 'Club Football Archive 2000-2025';

export type ArchiveTeamAliasOverride = {
  countryCode: string;
  aliasName: string;
  canonicalName: string;
};

export const ARCHIVE_DIVISIONS: ArchiveDivisionConfig[] = [
  { code: 'E0', countryCode: 'ENG', countryName: 'England', leagueName: 'Premier League', leagueSlug: 'england-premier-league', tier: 1, calendarSeason: false },
  { code: 'E1', countryCode: 'ENG', countryName: 'England', leagueName: 'Championship', leagueSlug: 'england-championship', tier: 2, calendarSeason: false },
  { code: 'E2', countryCode: 'ENG', countryName: 'England', leagueName: 'League One', leagueSlug: 'england-league-one', tier: 3, calendarSeason: false },
  { code: 'E3', countryCode: 'ENG', countryName: 'England', leagueName: 'League Two', leagueSlug: 'england-league-two', tier: 4, calendarSeason: false },
  { code: 'EC', countryCode: 'ENG', countryName: 'England', leagueName: 'National League', leagueSlug: 'england-national-league', tier: 5, calendarSeason: false },
  { code: 'SC0', countryCode: 'SCO', countryName: 'Scotland', leagueName: 'Scottish Premiership', leagueSlug: 'scotland-premiership', tier: 1, calendarSeason: false },
  { code: 'SC1', countryCode: 'SCO', countryName: 'Scotland', leagueName: 'Scottish Championship', leagueSlug: 'scotland-championship', tier: 2, calendarSeason: false },
  { code: 'SC2', countryCode: 'SCO', countryName: 'Scotland', leagueName: 'Scottish League One', leagueSlug: 'scotland-league-one', tier: 3, calendarSeason: false },
  { code: 'SC3', countryCode: 'SCO', countryName: 'Scotland', leagueName: 'Scottish League Two', leagueSlug: 'scotland-league-two', tier: 4, calendarSeason: false },
  { code: 'SP1', countryCode: 'ESP', countryName: 'Spain', leagueName: 'La Liga', leagueSlug: 'spain-la-liga', tier: 1, calendarSeason: false },
  { code: 'SP2', countryCode: 'ESP', countryName: 'Spain', leagueName: 'Segunda Division', leagueSlug: 'spain-segunda-division', tier: 2, calendarSeason: false },
  { code: 'D1', countryCode: 'GER', countryName: 'Germany', leagueName: 'Bundesliga', leagueSlug: 'germany-bundesliga', tier: 1, calendarSeason: false },
  { code: 'D2', countryCode: 'GER', countryName: 'Germany', leagueName: '2. Bundesliga', leagueSlug: 'germany-2-bundesliga', tier: 2, calendarSeason: false },
  { code: 'F1', countryCode: 'FRA', countryName: 'France', leagueName: 'Ligue 1', leagueSlug: 'france-ligue-1', tier: 1, calendarSeason: false },
  { code: 'F2', countryCode: 'FRA', countryName: 'France', leagueName: 'Ligue 2', leagueSlug: 'france-ligue-2', tier: 2, calendarSeason: false },
  { code: 'I1', countryCode: 'ITA', countryName: 'Italy', leagueName: 'Serie A', leagueSlug: 'italy-serie-a', tier: 1, calendarSeason: false },
  { code: 'I2', countryCode: 'ITA', countryName: 'Italy', leagueName: 'Serie B', leagueSlug: 'italy-serie-b', tier: 2, calendarSeason: false },
  { code: 'N1', countryCode: 'NED', countryName: 'Netherlands', leagueName: 'Eredivisie', leagueSlug: 'netherlands-eredivisie', tier: 1, calendarSeason: false },
  { code: 'B1', countryCode: 'BEL', countryName: 'Belgium', leagueName: 'Belgian Pro League', leagueSlug: 'belgium-pro-league', tier: 1, calendarSeason: false },
  { code: 'P1', countryCode: 'POR', countryName: 'Portugal', leagueName: 'Primeira Liga', leagueSlug: 'portugal-primeira-liga', tier: 1, calendarSeason: false },
  { code: 'T1', countryCode: 'TUR', countryName: 'Turkey', leagueName: 'Turkish Super Lig', leagueSlug: 'turkish-super-lig-turkey', tier: 1, calendarSeason: false },
  { code: 'G1', countryCode: 'GRE', countryName: 'Greece', leagueName: 'Super League Greece', leagueSlug: 'greece-super-league', tier: 1, calendarSeason: false },
  { code: 'ARG', countryCode: 'ARG', countryName: 'Argentina', leagueName: 'Primera Division', leagueSlug: 'argentina-primera-division', tier: 1, calendarSeason: true },
  { code: 'BRA', countryCode: 'BRA', countryName: 'Brazil', leagueName: 'Serie A', leagueSlug: 'brazil-serie-a', tier: 1, calendarSeason: true },
  { code: 'USA', countryCode: 'USA', countryName: 'United States', leagueName: 'Major League Soccer', leagueSlug: 'usa-major-league-soccer', tier: 1, calendarSeason: true },
  { code: 'JAP', countryCode: 'JPN', countryName: 'Japan', leagueName: 'J1 League', leagueSlug: 'japan-j1-league', tier: 1, calendarSeason: true },
  { code: 'AUT', countryCode: 'AUT', countryName: 'Austria', leagueName: 'Bundesliga', leagueSlug: 'austria-bundesliga', tier: 1, calendarSeason: false },
  { code: 'SUI', countryCode: 'CHE', countryName: 'Switzerland', leagueName: 'Super League', leagueSlug: 'switzerland-super-league', tier: 1, calendarSeason: false },
  { code: 'SWE', countryCode: 'SWE', countryName: 'Sweden', leagueName: 'Allsvenskan', leagueSlug: 'sweden-allsvenskan', tier: 1, calendarSeason: true },
  { code: 'FIN', countryCode: 'FIN', countryName: 'Finland', leagueName: 'Veikkausliiga', leagueSlug: 'finland-veikkausliiga', tier: 1, calendarSeason: true },
  { code: 'NOR', countryCode: 'NOR', countryName: 'Norway', leagueName: 'Eliteserien', leagueSlug: 'norway-eliteserien', tier: 1, calendarSeason: true },
  { code: 'DEN', countryCode: 'DNK', countryName: 'Denmark', leagueName: 'Superliga', leagueSlug: 'denmark-superliga', tier: 1, calendarSeason: false },
  { code: 'RUS', countryCode: 'RUS', countryName: 'Russia', leagueName: 'Premier League', leagueSlug: 'russia-premier-league', tier: 1, calendarSeason: false },
  { code: 'POL', countryCode: 'POL', countryName: 'Poland', leagueName: 'Ekstraklasa', leagueSlug: 'poland-ekstraklasa', tier: 1, calendarSeason: false },
  { code: 'ROM', countryCode: 'ROU', countryName: 'Romania', leagueName: 'Liga I', leagueSlug: 'romania-liga-i', tier: 1, calendarSeason: false },
  { code: 'IRL', countryCode: 'IRL', countryName: 'Ireland', leagueName: 'Premier Division', leagueSlug: 'ireland-premier-division', tier: 1, calendarSeason: true },
  { code: 'MEX', countryCode: 'MEX', countryName: 'Mexico', leagueName: 'Liga MX', leagueSlug: 'mexico-liga-mx', tier: 1, calendarSeason: true },
  { code: 'CHN', countryCode: 'CHN', countryName: 'China', leagueName: 'Super League', leagueSlug: 'china-super-league', tier: 1, calendarSeason: true },
];

export const ARCHIVE_DIVISION_MAP = new Map(ARCHIVE_DIVISIONS.map((item) => [item.code, item]));

export const ARCHIVE_TEAM_ALIAS_OVERRIDES: ArchiveTeamAliasOverride[] = [
  { countryCode: 'ENG', aliasName: 'Bournemouth', canonicalName: 'AFC Bournemouth' },
  { countryCode: 'ENG', aliasName: 'Brighton', canonicalName: 'Brighton & Hove Albion' },
  { countryCode: 'ENG', aliasName: 'Leeds', canonicalName: 'Leeds United' },
  { countryCode: 'ENG', aliasName: 'Man City', canonicalName: 'Manchester City' },
  { countryCode: 'ENG', aliasName: 'Man United', canonicalName: 'Manchester United' },
  { countryCode: 'ENG', aliasName: 'Newcastle', canonicalName: 'Newcastle United' },
  { countryCode: 'ENG', aliasName: "Nott'm Forest", canonicalName: 'Nottingham Forest' },
  { countryCode: 'ENG', aliasName: 'Nottm Forest', canonicalName: 'Nottingham Forest' },
  { countryCode: 'ENG', aliasName: 'Tottenham', canonicalName: 'Tottenham Hotspur' },
  { countryCode: 'ENG', aliasName: 'West Ham', canonicalName: 'West Ham United' },
  { countryCode: 'TUR', aliasName: 'Gaziantep', canonicalName: 'Gaziantep FK' },
  { countryCode: 'TUR', aliasName: 'Gaziantepspor', canonicalName: 'Gaziantep FK' },
  { countryCode: 'TUR', aliasName: 'Goztep', canonicalName: 'Goztepe' },
  { countryCode: 'TUR', aliasName: 'Karagumruk', canonicalName: 'Fatih Karagümrük' },
  { countryCode: 'TUR', aliasName: 'Rizespor', canonicalName: 'Caykur Rizespor' },
];

export const ARCHIVE_TEAM_ALIAS_OVERRIDE_MAP = new Map(
  ARCHIVE_TEAM_ALIAS_OVERRIDES.map((item) => [
    `${item.countryCode}:${item.aliasName.toLowerCase()}`,
    item,
  ]),
);
