import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { PROVIDER_POLICIES } from 'src/shared/constants/provider.constants';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class BallDontLieClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(
    configService: ConfigService,
    metricsService: MetricsService,
  ) {
    const policy = PROVIDER_POLICIES.find((item) => item.code === 'ball_dont_lie');
    const rateLimitPerSecond = Math.max(1, Math.floor((policy?.rateLimitPerMinute || 600) / 60));
    this.http = new BaseProviderHttpClient(
      process.env.BALL_DONT_LIE_BASE_URL || 'https://api.balldontlie.io/v1',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
      rateLimitPerSecond,
      {
        providerCode: 'ball_dont_lie',
        circuitBreakerThreshold: Number(configService.get<number>('providers.circuitBreakerThreshold', 5)),
        circuitBreakerCooldownMs: Number(configService.get<number>('providers.circuitBreakerCooldownMs', 30000)),
        adaptiveBackoffMaxMs: Number(configService.get<number>('providers.adaptiveBackoffMaxMs', 15000)),
        observe: (status, durationMs) => metricsService.observeProviderCall('ball_dont_lie', status, durationMs),
      },
    );

    this.apiKey = process.env.BALL_DONT_LIE_API_KEY;
  }

  getTeams(rawDebug = false): Promise<unknown> {
    return this.http.get('/teams', { headers: this.getAuthHeaders() }, rawDebug);
  }

  getPlayers(teamId?: string, rawDebug = false): Promise<unknown> {
    const query = new URLSearchParams();
    if (teamId) {
      query.append('team_ids[]', teamId);
    }
    query.append('per_page', '100');
    return this.http.get(`/players?${query.toString()}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getGames(params?: {
    date?: string;
    from?: string;
    to?: string;
    teamId?: string;
    season?: string;
    rawDebug?: boolean;
  }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.date) {
      query.append('dates[]', params.date);
    }
    if (params?.from) {
      query.append('start_date', params.from);
    }
    if (params?.to) {
      query.append('end_date', params.to);
    }
    if (params?.teamId) {
      query.append('team_ids[]', params.teamId);
    }
    if (params?.season) {
      query.append('seasons[]', params.season);
    }
    query.append('per_page', '100');

    return this.http.get(`/games?${query.toString()}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
  }

  getGameById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/games/${id}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getGameStats(gameId: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/stats?game_ids[]=${encodeURIComponent(gameId)}&per_page=100`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('BALL_DONT_LIE_API_KEY is missing');
    }

    return {
      Authorization: this.apiKey,
    };
  }
}
