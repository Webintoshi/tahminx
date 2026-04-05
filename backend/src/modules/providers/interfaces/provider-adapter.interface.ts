import {
  NormalizedLeague,
  NormalizedMatch,
  NormalizedMatchEvent,
  NormalizedPlayer,
  NormalizedPlayerStats,
  NormalizedSeason,
  NormalizedStanding,
  NormalizedTeam,
  NormalizedTeamStats,
} from './normalized.types';

export interface ProviderMatchQuery {
  date?: string;
  from?: string;
  to?: string;
  leagueExternalId?: string;
  seasonExternalId?: string;
}

export interface ProviderAdapter {
  readonly code: string;

  getLeagues(): Promise<NormalizedLeague[]>;
  getSeasons(leagueExternalId?: string): Promise<NormalizedSeason[]>;
  getTeams(leagueExternalId?: string): Promise<NormalizedTeam[]>;
  getPlayers(teamExternalId?: string): Promise<NormalizedPlayer[]>;
  getMatches(params?: ProviderMatchQuery): Promise<NormalizedMatch[]>;
  getMatchById(externalMatchId: string): Promise<NormalizedMatch | null>;
  getStandings(leagueExternalId: string, seasonExternalId?: string): Promise<NormalizedStanding[]>;
  getTeamStats(externalMatchId: string): Promise<NormalizedTeamStats[]>;
  getPlayerStats(externalMatchId: string): Promise<NormalizedPlayerStats[]>;
  getMatchEvents(externalMatchId: string): Promise<NormalizedMatchEvent[]>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; message?: string }>;
}