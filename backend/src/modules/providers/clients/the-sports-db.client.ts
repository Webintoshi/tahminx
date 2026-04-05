import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { PROVIDER_POLICIES } from 'src/shared/constants/provider.constants';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class TheSportsDbClient {
  private readonly http: BaseProviderHttpClient;

  constructor(
    configService: ConfigService,
    metricsService: MetricsService,
  ) {
    const policy = PROVIDER_POLICIES.find((item) => item.code === 'the_sports_db');
    const rateLimitPerSecond = Math.max(1, Math.floor((policy?.rateLimitPerMinute || 300) / 60));
    this.http = new BaseProviderHttpClient(
      process.env.THE_SPORTS_DB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/3',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
      rateLimitPerSecond,
      {
        providerCode: 'the_sports_db',
        circuitBreakerThreshold: Number(configService.get<number>('providers.circuitBreakerThreshold', 5)),
        circuitBreakerCooldownMs: Number(configService.get<number>('providers.circuitBreakerCooldownMs', 30000)),
        adaptiveBackoffMaxMs: Number(configService.get<number>('providers.adaptiveBackoffMaxMs', 15000)),
        observe: (status, durationMs) => metricsService.observeProviderCall('the_sports_db', status, durationMs),
      },
    );
  }

  getLeagues(rawDebug = false): Promise<unknown> {
    return this.http.get('/all_leagues.php', undefined, rawDebug);
  }

  getTeams(league?: string, rawDebug = false): Promise<unknown> {
    const suffix = league ? `?l=${encodeURIComponent(league)}` : '';
    return this.http.get(`/search_all_teams.php${suffix}`, undefined, rawDebug);
  }

  getEventsByDate(date: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/eventsday.php?d=${date}`, undefined, rawDebug);
  }

  getEventById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/lookupevent.php?id=${id}`, undefined, rawDebug);
  }
}
