import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../clients/api-football.client';
import { ProviderAdapter, ProviderMatchQuery } from '../interfaces/provider-adapter.interface';
import {
  mapRawLeagues,
  mapRawMatchEvents,
  mapRawMatches,
  mapRawPlayerStats,
  mapRawPlayers,
  mapRawSeasons,
  mapRawStandings,
  mapRawTeams,
  mapRawTeamStats,
} from '../mappers/provider-normalizer.mapper';

@Injectable()
export class ApiFootballProviderAdapter implements ProviderAdapter {
  readonly code = 'api_football';
  private readonly logger = new Logger(ApiFootballProviderAdapter.name);

  constructor(private readonly client: ApiFootballClient) {}

  async getLeagues() {
    try {
      const response = (await this.client.getLeagues(process.env.PROVIDER_RAW_DEBUG === 'true')) as { response?: unknown[] };
      const rows = (response.response || []).map((item) => ((item as { league?: unknown }).league ?? item));
      return mapRawLeagues(rows, 'FOOTBALL');
    } catch (error) {
      this.logger.error(`getLeagues failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getSeasons(leagueExternalId?: string) {
    if (!leagueExternalId) return [];
    return mapRawSeasons([{ season: new Date().getUTCFullYear() }], leagueExternalId);
  }

  async getTeams(leagueExternalId?: string) {
    try {
      const response = (await this.client.getTeams(leagueExternalId, String(new Date().getUTCFullYear()), process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        response?: unknown[];
      };
      const rows = (response.response || []).map((item) => (item as { team?: unknown }).team ?? item);
      return mapRawTeams(rows);
    } catch (error) {
      this.logger.error(`getTeams failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayers() {
    return mapRawPlayers([]);
  }

  async getMatches(params?: ProviderMatchQuery) {
    try {
      const response = (await this.client.getFixtures({
        date: params?.date,
        from: params?.from,
        to: params?.to,
        league: params?.leagueExternalId,
        season: params?.seasonExternalId,
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { response?: unknown[] };
      return mapRawMatches(response.response || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getFixtureById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        response?: unknown[];
      };
      const mapped = mapRawMatches(response.response || []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings(leagueExternalId: string, seasonExternalId?: string) {
    try {
      const response = (await this.client.getStandings(
        leagueExternalId,
        seasonExternalId || String(new Date().getUTCFullYear()),
        process.env.PROVIDER_RAW_DEBUG === 'true',
      )) as {
        response?: Array<{ league?: { standings?: unknown[][] } }>;
      };
      const table = response.response?.[0]?.league?.standings?.[0] || [];
      return mapRawStandings(table);
    } catch (error) {
      this.logger.error(`getStandings failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeamStats(externalMatchId: string) {
    return mapRawTeamStats([], externalMatchId);
  }

  async getPlayerStats(externalMatchId: string) {
    return mapRawPlayerStats([], externalMatchId);
  }

  async getMatchEvents(externalMatchId: string) {
    return mapRawMatchEvents([], externalMatchId);
  }

  async healthCheck() {
    const start = Date.now();
    try {
      await this.client.getLeagues();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: (error as Error).message };
    }
  }
}