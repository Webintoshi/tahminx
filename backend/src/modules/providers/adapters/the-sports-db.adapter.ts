import { Injectable, Logger } from '@nestjs/common';
import { TheSportsDbClient } from '../clients/the-sports-db.client';
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
export class TheSportsDbProviderAdapter implements ProviderAdapter {
  readonly code = 'the_sports_db';
  private readonly logger = new Logger(TheSportsDbProviderAdapter.name);

  constructor(private readonly client: TheSportsDbClient) {}

  async getLeagues() {
    try {
      const response = (await this.client.getLeagues(process.env.PROVIDER_RAW_DEBUG === 'true')) as { leagues?: unknown[] };
      return mapRawLeagues(response.leagues || [], 'FOOTBALL');
    } catch (error) {
      this.logger.error(`getLeagues failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getSeasons(leagueExternalId?: string) {
    return mapRawSeasons([{ season: new Date().getUTCFullYear() }], leagueExternalId || 'thesportsdb');
  }

  async getTeams(leagueExternalId?: string) {
    try {
      const response = (await this.client.getTeams(leagueExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        teams?: unknown[];
      };
      return mapRawTeams(response.teams || []);
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
      const response = (await this.client.getEventsByDate(
        params?.date || new Date().toISOString().slice(0, 10),
        process.env.PROVIDER_RAW_DEBUG === 'true',
      )) as { events?: unknown[] };
      return mapRawMatches(response.events || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getEventById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        events?: unknown[];
      };
      const mapped = mapRawMatches(response.events || []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings() {
    return mapRawStandings([]);
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