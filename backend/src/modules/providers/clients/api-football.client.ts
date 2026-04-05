import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { PROVIDER_POLICIES } from 'src/shared/constants/provider.constants';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class ApiFootballClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(
    configService: ConfigService,
    metricsService: MetricsService,
  ) {
    const policy = PROVIDER_POLICIES.find((item) => item.code === 'api_football');
    const rateLimitPerSecond = Math.max(1, Math.floor((policy?.rateLimitPerMinute || 120) / 60));
    this.http = new BaseProviderHttpClient(
      process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
      rateLimitPerSecond,
      {
        providerCode: 'api_football',
        circuitBreakerThreshold: Number(configService.get<number>('providers.circuitBreakerThreshold', 5)),
        circuitBreakerCooldownMs: Number(configService.get<number>('providers.circuitBreakerCooldownMs', 30000)),
        adaptiveBackoffMaxMs: Number(configService.get<number>('providers.adaptiveBackoffMaxMs', 15000)),
        observe: (status, durationMs) => metricsService.observeProviderCall('api_football', status, durationMs),
      },
    );

    this.apiKey = process.env.API_FOOTBALL_API_KEY;
  }

  getLeagues(rawDebug = false): Promise<unknown> {
    return this.http.get('/leagues', { headers: this.getAuthHeaders() }, rawDebug);
  }

  getTeams(league?: string, season?: string, rawDebug = false): Promise<unknown> {
    const query = new URLSearchParams();
    if (league) query.set('league', league);
    if (season) query.set('season', season);
    return this.http.get(`/teams?${query.toString()}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getFixtures(params?: { date?: string; from?: string; to?: string; league?: string; season?: string; rawDebug?: boolean }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.league) query.set('league', params.league);
    if (params?.season) query.set('season', params.season);
    return this.http.get(`/fixtures?${query.toString()}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
  }

  getFixtureById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/fixtures?id=${id}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getStandings(league: string, season: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/standings?league=${league}&season=${season}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('API_FOOTBALL_API_KEY is missing');
    }

    return {
      'x-rapidapi-key': this.apiKey,
      'x-apisports-key': this.apiKey,
    };
  }
}
