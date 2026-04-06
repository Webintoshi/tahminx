import { Injectable, Logger } from '@nestjs/common';
import { FootballDataClient } from '../clients/football-data.client';
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
export class FootballDataProviderAdapter implements ProviderAdapter {
  readonly code = 'football_data';
  private readonly logger = new Logger(FootballDataProviderAdapter.name);

  constructor(private readonly client: FootballDataClient) {}

  async getLeagues() {
    try {
      const response = (await this.client.getLeagues(process.env.PROVIDER_RAW_DEBUG === 'true')) as { competitions?: unknown[] };
      return mapRawLeagues(response.competitions || [], 'FOOTBALL');
    } catch (error) {
      this.logger.error(`getLeagues failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getSeasons(leagueExternalId?: string) {
    if (!leagueExternalId) {
      return [];
    }

    try {
      const response = (await this.client.getCompetition(leagueExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        currentSeason?: Record<string, unknown>;
        seasons?: unknown[];
      };

      const seasons = Array.isArray(response.seasons)
        ? response.seasons
        : response.currentSeason
          ? [response.currentSeason]
          : [];

      return mapRawSeasons(seasons, leagueExternalId);
    } catch (error) {
      this.logger.error(`getSeasons failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeams(leagueExternalId?: string) {
    if (!leagueExternalId) {
      return [];
    }

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
      const response = (await this.client.getMatches({
        date: params?.date,
        dateFrom: params?.from,
        dateTo: params?.to,
        competitionCode: params?.leagueExternalId,
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { matches?: unknown[] };
      return mapRawMatches(response.matches || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getMatchById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        match?: unknown;
      };
      const mapped = mapRawMatches(response.match ? [response.match] : []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings(leagueExternalId: string) {
    try {
      const response = (await this.client.getStandings(leagueExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        standings?: Array<{ table?: unknown[] }>;
      };
      const table = response.standings?.[0]?.table || [];
      return mapRawStandings(table);
    } catch (error) {
      this.logger.error(`getStandings failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeamStats(externalMatchId: string) {
    try {
      const response = (await this.client.getMatchById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        match?: {
          homeTeam?: { id?: string | number };
          awayTeam?: { id?: string | number };
        };
      };

      const match = response.match;
      if (!match?.homeTeam?.id || !match?.awayTeam?.id) {
        return [];
      }

      return mapRawTeamStats(
        [
          { team: { id: match.homeTeam.id } },
          { team: { id: match.awayTeam.id } },
        ],
        externalMatchId,
      );
    } catch (error) {
      this.logger.error(`getTeamStats failed: ${(error as Error).message}`);
      return [];
    }
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
      if (this.client.hasApiKeyConfigured()) {
        await this.client.getLeagues();
      } else {
        await this.client.getTeams('PL');
      }
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: (error as Error).message };
    }
  }
}
