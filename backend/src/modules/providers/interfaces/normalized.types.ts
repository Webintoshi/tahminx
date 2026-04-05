export interface NormalizedLeague {
  externalId: string;
  name: string;
  country?: string;
  sportCode: 'FOOTBALL' | 'BASKETBALL';
  logoUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedSeason {
  externalId: string;
  leagueExternalId: string;
  seasonYear: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedTeam {
  externalId: string;
  name: string;
  shortName?: string;
  country?: string;
  logoUrl?: string;
  venue?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedPlayer {
  externalId: string;
  name: string;
  teamExternalId?: string;
  nationality?: string;
  position?: string;
  birthDate?: string;
  photoUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedMatch {
  externalId: string;
  leagueExternalId: string;
  seasonExternalId?: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  matchDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELED';
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedStanding {
  externalTeamId: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points: number;
  form?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedMatchEvent {
  externalMatchId: string;
  minute?: number;
  type: string;
  externalTeamId?: string;
  externalPlayerId?: string;
  payload: Record<string, unknown>;
}

export interface NormalizedTeamStats {
  externalMatchId: string;
  externalTeamId: string;
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  corners?: number;
  fouls?: number;
  payload?: Record<string, unknown>;
}

export interface NormalizedPlayerStats {
  externalMatchId: string;
  externalPlayerId: string;
  externalTeamId?: string;
  minutes?: number;
  points?: number;
  assists?: number;
  rebounds?: number;
  goals?: number;
  payload?: Record<string, unknown>;
}