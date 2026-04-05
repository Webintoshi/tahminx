import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { PROVIDER_POLICIES } from 'src/shared/constants/provider.constants';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class FootballDataClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(
    configService: ConfigService,
    metricsService: MetricsService,
  ) {
    const policy = PROVIDER_POLICIES.find((item) => item.code === 'football_data');
    const rateLimitPerSecond = Math.max(1, Math.floor((policy?.rateLimitPerMinute || 60) / 60));
    this.http = new BaseProviderHttpClient(
      process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
      rateLimitPerSecond,
      {
        providerCode: 'football_data',
        circuitBreakerThreshold: Number(configService.get<number>('providers.circuitBreakerThreshold', 5)),
        circuitBreakerCooldownMs: Number(configService.get<number>('providers.circuitBreakerCooldownMs', 30000)),
        adaptiveBackoffMaxMs: Number(configService.get<number>('providers.adaptiveBackoffMaxMs', 15000)),
        observe: (status, durationMs) => metricsService.observeProviderCall('football_data', status, durationMs),
      },
    );

    this.apiKey = process.env.FOOTBALL_DATA_API_KEY;
  }

  getLeagues(rawDebug = false): Promise<unknown> {
    return this.http.get('/competitions', { headers: this.getAuthHeaders() }, rawDebug);
  }

  getCompetition(leagueCode: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/competitions/${leagueCode}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getTeams(leagueCode: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/competitions/${leagueCode}/teams`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getMatches(params?: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    competitionCode?: string;
    status?: string;
    rawDebug?: boolean;
  }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.date) {
      query.set('dateFrom', params.date);
      query.set('dateTo', params.date);
    }
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.competitionCode) query.set('competitions', params.competitionCode);
    if (params?.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.http.get(`/matches${suffix}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
  }

  getStandings(leagueCode: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/competitions/${leagueCode}/standings`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getMatchById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/matches/${id}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY is missing');
    }
    return {
      'X-Auth-Token': this.apiKey,
    };
  }
}
