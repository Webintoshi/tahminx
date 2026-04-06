import { Injectable, Logger } from '@nestjs/common';
import { BallDontLieClient } from '../clients/ball-dont-lie.client';
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
export class BallDontLieProviderAdapter implements ProviderAdapter {
  readonly code = 'ball_dont_lie';
  private readonly logger = new Logger(BallDontLieProviderAdapter.name);

  constructor(private readonly client: BallDontLieClient) {}

  async getLeagues() {
    return mapRawLeagues([{ id: 'nba', name: 'NBA', country: 'USA' }], 'BASKETBALL');
  }

  async getSeasons(leagueExternalId?: string) {
    const now = new Date();
    const currentSeason = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return mapRawSeasons([{ season: currentSeason }], leagueExternalId || 'nba');
  }

  async getTeams() {
    try {
      const response = (await this.client.getTeams(process.env.PROVIDER_RAW_DEBUG === 'true')) as { data?: unknown[] };
      return mapRawTeams(response.data || []);
    } catch (error) {
      this.logger.error(`getTeams failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayers(teamExternalId?: string) {
    try {
      const response = (await this.client.getPlayers(teamExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        data?: unknown[];
      };
      return mapRawPlayers(response.data || []);
    } catch (error) {
      this.logger.error(`getPlayers failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatches(params?: ProviderMatchQuery) {
    try {
      const season = params?.seasonExternalId || String(new Date(params?.date || Date.now()).getUTCFullYear());
      const response = (await this.client.getGames({
        date: params?.date,
        from: params?.from,
        to: params?.to,
        season,
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { data?: unknown[] };
      return mapRawMatches(response.data || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getGameById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as unknown;
      const mapped = mapRawMatches(response ? [response] : []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings(_: string, seasonExternalId?: string) {
    try {
      if (!this.client.hasApiKeyConfigured()) {
        const response = (await this.client.getStandings(process.env.PROVIDER_RAW_DEBUG === 'true')) as { data?: unknown[] };
        return mapRawStandings(response.data || []);
      }

      const response = (await this.client.getGames({
        season: seasonExternalId || String(new Date().getUTCFullYear()),
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { data?: Array<Record<string, unknown>> };

      const games = response.data || [];
      const tableMap = new Map<string, {
        teamId: string;
        wins: number;
        losses: number;
        pointsFor: number;
        pointsAgainst: number;
        played: number;
      }>();

      for (const game of games) {
        const homeTeam = game.home_team as Record<string, unknown> | undefined;
        const awayTeam = game.visitor_team as Record<string, unknown> | undefined;
        const homeId = String(homeTeam?.id || '');
        const awayId = String(awayTeam?.id || '');
        if (!homeId || !awayId) {
          continue;
        }

        const homeScore = Number(game.home_team_score || 0);
        const awayScore = Number(game.visitor_team_score || 0);

        const home = tableMap.get(homeId) || {
          teamId: homeId,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          played: 0,
        };
        const away = tableMap.get(awayId) || {
          teamId: awayId,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          played: 0,
        };

        home.played += 1;
        away.played += 1;
        home.pointsFor += homeScore;
        home.pointsAgainst += awayScore;
        away.pointsFor += awayScore;
        away.pointsAgainst += homeScore;

        if (homeScore >= awayScore) {
          home.wins += 1;
          away.losses += 1;
        } else {
          away.wins += 1;
          home.losses += 1;
        }

        tableMap.set(homeId, home);
        tableMap.set(awayId, away);
      }

      const sorted = [...tableMap.values()].sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

      return mapRawStandings(
        sorted.map((item, index) => ({
          team: { id: item.teamId },
          rank: index + 1,
          played: item.played,
          wins: item.wins,
          draws: 0,
          losses: item.losses,
          goalsFor: item.pointsFor,
          goalsAgainst: item.pointsAgainst,
          points: item.wins,
          form: '',
        })),
      );
    } catch (error) {
      this.logger.error(`getStandings failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeamStats(externalMatchId: string) {
    try {
      const response = (await this.client.getGameById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as Record<
        string,
        unknown
      >;
      const homeTeam = response.home_team as Record<string, unknown> | undefined;
      const awayTeam = response.visitor_team as Record<string, unknown> | undefined;
      const homeScore = Number(response.home_team_score || 0);
      const awayScore = Number(response.visitor_team_score || 0);

      return mapRawTeamStats(
        [
          { team: { id: homeTeam?.id }, shots: homeScore, possession: 50, payload: response },
          { team: { id: awayTeam?.id }, shots: awayScore, possession: 50, payload: response },
        ],
        externalMatchId,
      );
    } catch (error) {
      this.logger.error(`getTeamStats failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayerStats(externalMatchId: string) {
    try {
      const response = (await this.client.getGameStats(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        data?: unknown[];
      };
      return mapRawPlayerStats(response.data || [], externalMatchId);
    } catch (error) {
      this.logger.error(`getPlayerStats failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchEvents(externalMatchId: string) {
    return mapRawMatchEvents([], externalMatchId);
  }

  async healthCheck() {
    const start = Date.now();
    try {
      await this.client.getTeams();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: (error as Error).message };
    }
  }
}
