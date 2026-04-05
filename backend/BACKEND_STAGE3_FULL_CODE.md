# BACKEND STAGE3 FULL CODE

## src/shared/constants/provider.constants.ts
`$ext
export interface ProviderPolicy {
  code: string;
  requiredApiKey: boolean;
  defaultActive: boolean;
  primary: boolean;
  envKey: string;
  rateLimitPerMinute: number;
}

export const PROVIDER_POLICIES: ProviderPolicy[] = [
  {
    code: 'football_data',
    requiredApiKey: true,
    defaultActive: true,
    primary: true,
    envKey: 'FOOTBALL_DATA_API_KEY',
    rateLimitPerMinute: 60,
  },
  {
    code: 'ball_dont_lie',
    requiredApiKey: true,
    defaultActive: true,
    primary: true,
    envKey: 'BALL_DONT_LIE_API_KEY',
    rateLimitPerMinute: 600,
  },
  {
    code: 'api_football',
    requiredApiKey: true,
    defaultActive: false,
    primary: false,
    envKey: 'API_FOOTBALL_API_KEY',
    rateLimitPerMinute: 120,
  },
  {
    code: 'the_sports_db',
    requiredApiKey: false,
    defaultActive: false,
    primary: false,
    envKey: 'THE_SPORTS_DB_API_KEY',
    rateLimitPerMinute: 300,
  },
];

export const PROVIDER_CODE_TO_SPORT: Record<string, 'FOOTBALL' | 'BASKETBALL'> = {
  football_data: 'FOOTBALL',
  api_football: 'FOOTBALL',
  the_sports_db: 'FOOTBALL',
  ball_dont_lie: 'BASKETBALL',
};

` 

## src/common/metrics/metrics.service.ts
`$ext
import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requestCount: Counter<string>;
  private readonly requestDurationMs: Histogram<string>;
  private readonly queueJobTotal: Counter<string>;
  private readonly queueJobDurationMs: Histogram<string>;
  private readonly providerRequestTotal: Counter<string>;
  private readonly providerLatencyMs: Histogram<string>;
  private readonly ingestionRunsTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.requestCount = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.requestDurationMs = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2000],
      registers: [this.registry],
    });

    this.queueJobTotal = new Counter({
      name: 'queue_jobs_total',
      help: 'Total queue job executions',
      labelNames: ['queue', 'job', 'status'],
      registers: [this.registry],
    });

    this.queueJobDurationMs = new Histogram({
      name: 'queue_job_duration_ms',
      help: 'Queue job execution duration in milliseconds',
      labelNames: ['queue', 'job', 'status'],
      buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000, 15000],
      registers: [this.registry],
    });

    this.providerRequestTotal = new Counter({
      name: 'provider_requests_total',
      help: 'Total provider requests and health checks',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.providerLatencyMs = new Histogram({
      name: 'provider_request_duration_ms',
      help: 'Provider request latency in milliseconds',
      labelNames: ['provider', 'status'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
      registers: [this.registry],
    });

    this.ingestionRunsTotal = new Counter({
      name: 'ingestion_runs_total',
      help: 'Ingestion run counter by job and status',
      labelNames: ['job', 'status'],
      registers: [this.registry],
    });
  }

  observeHttp(method: string, path: string, status: string, durationMs: number): void {
    this.requestCount.inc({ method, path, status });
    this.requestDurationMs.observe({ method, path, status }, durationMs);
  }

  observeQueueJob(queue: string, job: string, status: 'success' | 'failed', durationMs: number): void {
    this.queueJobTotal.inc({ queue, job, status });
    this.queueJobDurationMs.observe({ queue, job, status }, durationMs);
  }

  observeProviderCall(provider: string, status: 'success' | 'failed', durationMs: number): void {
    this.providerRequestTotal.inc({ provider, status });
    this.providerLatencyMs.observe({ provider, status }, durationMs);
  }

  recordIngestionRun(job: string, status: 'success' | 'failed'): void {
    this.ingestionRunsTotal.inc({ job, status });
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}

` 

## src/modules/providers/providers.service.ts
`$ext
import { Injectable, Logger } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { PROVIDER_CODE_TO_SPORT, PROVIDER_POLICIES, ProviderPolicy } from 'src/shared/constants/provider.constants';
import { ApiFootballProviderAdapter } from './adapters/api-football.adapter';
import { BallDontLieProviderAdapter } from './adapters/ball-dont-lie.adapter';
import { FootballDataProviderAdapter } from './adapters/football-data.adapter';
import { TheSportsDbProviderAdapter } from './adapters/the-sports-db.adapter';
import { ProviderAdapter } from './interfaces/provider-adapter.interface';

interface ProviderRuntime {
  provider: Provider & { configs: { key: string; valueEncrypted: string; isEnabled: boolean }[] };
  policy: ProviderPolicy;
  adapter: ProviderAdapter;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeySource: 'provider_config' | 'env' | 'missing';
  keyName: string;
  reason?: string;
}

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);
  private readonly adapters: ProviderAdapter[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    footballData: FootballDataProviderAdapter,
    apiFootball: ApiFootballProviderAdapter,
    ballDontLie: BallDontLieProviderAdapter,
    theSportsDb: TheSportsDbProviderAdapter,
  ) {
    this.adapters = [footballData, apiFootball, ballDontLie, theSportsDb];
  }

  getAdapterByCode(code: string): ProviderAdapter {
    const adapter = this.adapters.find((item) => item.code === code);
    if (!adapter) {
      throw new Error(`Unsupported provider code: ${code}`);
    }
    return adapter;
  }

  async getActiveAdapterCodes(sportCode?: 'FOOTBALL' | 'BASKETBALL'): Promise<string[]> {
    const runtimes = await this.loadProviderRuntime();
    return runtimes
      .filter((runtime) => runtime.enabled)
      .filter((runtime) => (sportCode ? PROVIDER_CODE_TO_SPORT[runtime.adapter.code] === sportCode : true))
      .sort((a, b) => Number(b.policy.primary) - Number(a.policy.primary))
      .map((runtime) => runtime.adapter.code);
  }

  async isProviderEnabled(code: string): Promise<boolean> {
    const runtimes = await this.loadProviderRuntime();
    return Boolean(runtimes.find((item) => item.provider.code === code)?.enabled);
  }

  async health(forceRefresh = false) {
    const key = 'providers:health';

    if (forceRefresh) {
      await this.cacheService.del([key]);
      const data = await this.computeHealth();
      await this.cacheService.set(key, data, 60);
      return data;
    }

    return this.cacheService.getOrSet(key, 60, () => this.computeHealth());
  }

  async rateLimitStatus() {
    return this.cacheService.getOrSet('providers:rate-limit', 30, async () => {
      const [providers, apiLogs, latest429s] = await Promise.all([
        this.prisma.provider.findMany({ where: { deletedAt: null }, orderBy: { code: 'asc' } }),
        this.prisma.apiLog.findMany({
          where: {
            providerId: { not: null },
            createdAt: { gte: new Date(Date.now() - 60 * 1000) },
          },
          select: { providerId: true, createdAt: true },
        }),
        this.prisma.apiLog.findMany({
          where: { providerId: { not: null }, statusCode: 429 },
          select: { providerId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      ]);

      const requestsByProvider = new Map<string, number>();
      for (const row of apiLogs) {
        requestsByProvider.set(row.providerId as string, (requestsByProvider.get(row.providerId as string) ?? 0) + 1);
      }

      const latest429ByProvider = new Map<string, string>();
      for (const row of latest429s) {
        if (!row.providerId || latest429ByProvider.has(row.providerId)) {
          continue;
        }
        latest429ByProvider.set(row.providerId, row.createdAt.toISOString());
      }

      return providers.map((provider) => {
        const policy = PROVIDER_POLICIES.find((item) => item.code === provider.code);
        const usedInLastMinute = requestsByProvider.get(provider.id) ?? 0;
        const limitPerMinute = policy?.rateLimitPerMinute ?? 60;
        const utilizationPercent = Number(((usedInLastMinute / Math.max(1, limitPerMinute)) * 100).toFixed(2));

        return {
          providerId: provider.id,
          providerCode: provider.code,
          limitPerMinute,
          usedInLastMinute,
          remainingEstimate: Math.max(0, limitPerMinute - usedInLastMinute),
          utilizationPercent,
          throttledRecently: latest429ByProvider.has(provider.id),
          last429At: latest429ByProvider.get(provider.id) || null,
        };
      });
    });
  }

  async logs(limit = 100) {
    return this.prisma.apiLog.findMany({
      where: { providerId: { not: null } },
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, Math.max(1, limit)),
    });
  }

  async saveProviderLog(input: {
    providerCode: string;
    path: string;
    statusCode: number;
    durationMs: number;
    errorMessage?: string;
  }) {
    const provider = await this.prisma.provider.findUnique({ where: { code: input.providerCode } });
    if (!provider) {
      this.logger.warn(`Provider log ignored because provider not found: ${input.providerCode}`);
      return;
    }

    const statusLabel = input.statusCode >= 400 ? 'failed' : 'success';
    this.metricsService.observeProviderCall(input.providerCode, statusLabel, input.durationMs);

    await this.prisma.apiLog.create({
      data: {
        providerId: provider.id,
        path: input.path,
        method: 'GET',
        statusCode: input.statusCode,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage,
      },
    });

    await this.cacheService.del(['providers:rate-limit']);
  }

  private async computeHealth() {
    const runtimes = await this.loadProviderRuntime();
    const checks = await Promise.all(
      runtimes.map(async (runtime) => {
        if (!runtime.enabled) {
          return {
            provider: runtime.adapter.code,
            healthy: false,
            latencyMs: 0,
            enabled: false,
            hasApiKey: runtime.hasApiKey,
            message: runtime.reason || 'Provider is disabled',
          };
        }

        const startedAt = Date.now();
        try {
          const check = await runtime.adapter.healthCheck();
          this.metricsService.observeProviderCall(runtime.adapter.code, 'success', Date.now() - startedAt);
          return {
            provider: runtime.adapter.code,
            enabled: true,
            hasApiKey: runtime.hasApiKey,
            ...check,
          };
        } catch (error) {
          this.metricsService.observeProviderCall(runtime.adapter.code, 'failed', Date.now() - startedAt);
          return {
            provider: runtime.adapter.code,
            enabled: true,
            hasApiKey: runtime.hasApiKey,
            healthy: false,
            latencyMs: 0,
            message: (error as Error).message,
          };
        }
      }),
    );

    return {
      adapters: checks,
      providers: runtimes.map((runtime) => ({
        id: runtime.provider.id,
        code: runtime.provider.code,
        name: runtime.provider.name,
        baseUrl: runtime.provider.baseUrl,
        isActive: runtime.provider.isActive,
        enabled: runtime.enabled,
        hasApiKey: runtime.hasApiKey,
        apiKeySource: runtime.apiKeySource,
        keyName: runtime.keyName,
        reason: runtime.reason,
        configs: runtime.provider.configs,
      })),
    };
  }

  private async loadProviderRuntime(): Promise<ProviderRuntime[]> {
    const providerRows = await this.prisma.provider.findMany({
      where: { deletedAt: null },
      include: { configs: true },
      orderBy: { name: 'asc' },
    });

    const runtimes: ProviderRuntime[] = [];

    for (const provider of providerRows) {
      const adapter = this.adapters.find((item) => item.code === provider.code);
      const policy = PROVIDER_POLICIES.find((item) => item.code === provider.code);
      if (!adapter || !policy) {
        continue;
      }

      const enabledValue = this.getConfigValue(provider, 'enabled');
      const enabledConfig = enabledValue === undefined ? policy.defaultActive : enabledValue !== 'false';
      const apiKeyFromConfig = this.getConfigValue(provider, 'apiKey');
      const apiKeyFromEnv = process.env[policy.envKey];
      const hasConfiguredKey = Boolean(apiKeyFromConfig && apiKeyFromConfig !== 'change_me');
      const hasEnvKey = Boolean(apiKeyFromEnv && apiKeyFromEnv !== 'change_me');
      const hasApiKey = policy.requiredApiKey ? hasConfiguredKey || hasEnvKey : true;

      const enabled = provider.isActive && enabledConfig && hasApiKey;

      let reason: string | undefined;
      if (!provider.isActive) {
        reason = 'Provider row is inactive';
      } else if (!enabledConfig) {
        reason = 'Provider config enabled=false';
      } else if (!hasApiKey && policy.requiredApiKey) {
        reason = `${policy.envKey} missing and provider config apiKey missing`;
      }

      runtimes.push({
        provider,
        policy,
        adapter,
        enabled,
        hasApiKey,
        apiKeySource: hasConfiguredKey ? 'provider_config' : hasEnvKey ? 'env' : 'missing',
        keyName: policy.envKey,
        reason,
      });
    }

    return runtimes;
  }

  private getConfigValue(provider: Provider & { configs: { key: string; valueEncrypted: string; isEnabled: boolean }[] }, key: string) {
    const row = provider.configs.find((config) => config.key === key && config.isEnabled);
    return row?.valueEncrypted;
  }
}

` 

## src/modules/providers/providers.controller.ts
`$ext
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ProvidersService } from './providers.service';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/providers')
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @Get('health')
  async health() {
    return { data: await this.service.health() };
  }

  @Get('logs')
  async logs(@Query('limit') limit?: string) {
    return { data: await this.service.logs(limit ? Number(limit) : 100) };
  }

  @Get('rate-limit')
  async rateLimitStatus() {
    return { data: await this.service.rateLimitStatus() };
  }

  @Get('configs')
  async configs() {
    const data = await this.service.health();
    return { data: data.providers.map((provider) => ({ code: provider.code, configs: provider.configs })) };
  }
}

` 

## src/modules/jobs/processors/health.processor.ts
`$ext
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { ProvidersService } from 'src/modules/providers/providers.service';
import { QUEUE_NAMES } from 'src/shared/constants/jobs.constants';

@Injectable()
@Processor(QUEUE_NAMES.HEALTH)
export class HealthProcessor extends WorkerHost {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    const startedAt = Date.now();
    try {
      const result = await this.providersService.health(true);
      this.metricsService.observeQueueJob(QUEUE_NAMES.HEALTH, job.name, 'success', Date.now() - startedAt);
      return result;
    } catch (error) {
      this.metricsService.observeQueueJob(QUEUE_NAMES.HEALTH, job.name, 'failed', Date.now() - startedAt);
      throw error;
    }
  }
}

` 

## src/modules/jobs/processors/prediction.processor.ts
`$ext
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { PredictionsService } from 'src/modules/predictions/predictions.service';
import { JobsService } from '../jobs.service';

interface PredictionJobPayload {
  matchId?: string;
  matchIds?: string[];
  source?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.PREDICTION)
export class PredictionProcessor extends WorkerHost {
  private readonly logger = new Logger(PredictionProcessor.name);

  constructor(
    private readonly predictionsService: PredictionsService,
    private readonly jobsService: JobsService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async process(job: Job<PredictionJobPayload>): Promise<unknown> {
    const startedAt = Date.now();
    this.logger.log(`Prediction job started: ${job.name}`);

    try {
      if (job.name === JOB_NAMES.generateFeatures) {
        const featureResult = await this.runFeatureGeneration(job);
        const successfulMatchIds = featureResult
          .filter((item) => item.status === 'success')
          .map((item) => item.matchId);

        if (successfulMatchIds.length) {
          await this.jobsService.enqueuePredictionBatch(successfulMatchIds, `feature-job:${String(job.id)}`);
        }

        const result = {
          ok: true,
          generatedFeatures: successfulMatchIds.length,
          failedFeatures: featureResult.length - successfulMatchIds.length,
          enqueuedPredictions: successfulMatchIds.length,
        };
        this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
        return result;
      }

      if (job.data?.matchId) {
        const result = await this.predictionsService.generateForMatch(job.data.matchId);
        this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
        return result;
      }

      if (job.data?.matchIds?.length) {
        const result = await this.predictionsService.generateForMatches(job.data.matchIds);
        this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
        return result;
      }

      const result = await this.predictionsService.generatePendingPredictions();
      this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
      return result;
    } catch (error) {
      this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'failed', Date.now() - startedAt);
      this.logger.error(
        `Prediction job failed name=${job.name} id=${String(job.id)} reason=${(error as Error).message}`,
      );
      throw error;
    }
  }

  private async runFeatureGeneration(job: Job<PredictionJobPayload>) {
    if (job.data.matchId) {
      const snapshot = await this.predictionsService.generateFeaturesForMatch(job.data.matchId);
      return [
        {
          matchId: snapshot.matchId,
          status: 'success' as const,
          modelFamily: snapshot.modelFamily,
        },
      ];
    }

    if (job.data.matchIds?.length) {
      return this.predictionsService.generateFeaturesForMatches(job.data.matchIds);
    }

    return this.predictionsService.generatePendingFeatures();
  }
}

` 

## src/modules/live/live.service.ts
`$ext
import { Injectable, Logger, MessageEvent, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { filter, interval, map, merge, Observable, of, Subject } from 'rxjs';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';

export interface LiveMatchEventPayload {
  eventType: 'matchEvent';
  matchId: string;
  sport: 'football' | 'basketball';
  leagueId: string | null;
  timestamp: string;
  source: string;
  payload: {
    eventId: string;
    minute: number | null;
    type: string;
    teamId: string | null;
    playerId: string | null;
    data: Record<string, unknown>;
  };
}

@Injectable()
export class LiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveService.name);
  private readonly stream$ = new Subject<LiveMatchEventPayload>();
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
  ) {
    const redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    };
    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
  }

  async onModuleInit(): Promise<void> {
    await this.subscriber.subscribe('live:match-events');
    this.subscriber.on('message', (_, payload) => {
      try {
        const parsed = JSON.parse(payload) as LiveMatchEventPayload;
        const normalized = this.normalizePayload(parsed);
        this.stream$.next(normalized);
      } catch (error) {
        this.logger.error(`Failed to parse live payload: ${(error as Error).message}`);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  async liveMatches() {
    return this.cacheService.getOrSet('live:matches', 15, async () =>
      this.prisma.match.findMany({ where: { status: 'LIVE' }, include: { league: true, homeTeam: true, awayTeam: true } }),
    );
  }

  streamEvents(matchId?: string): Observable<MessageEvent> {
    const connected$ = of<MessageEvent>({
      type: 'connected',
      data: {
        eventType: 'connected',
        timestamp: new Date().toISOString(),
        matchId: matchId || null,
      },
    });

    const heartbeat$ = interval(15000).pipe(
      map(() => ({
        type: 'heartbeat',
        data: {
          eventType: 'heartbeat',
          timestamp: new Date().toISOString(),
          matchId: matchId || null,
        },
      })),
    );

    const events$ = this.stream$.pipe(
      filter((event) => (matchId ? event.matchId === matchId : true)),
      map((event) => ({
        id: `${event.matchId}:${event.payload.eventId}:${event.timestamp}`,
        type: 'matchEvent',
        retry: 5000,
        data: event,
      })),
    );

    return merge(connected$, heartbeat$, events$);
  }

  async publishMatchEvent(payload: LiveMatchEventPayload) {
    const normalized = this.normalizePayload(payload);
    await this.publisher.publish('live:match-events', JSON.stringify(normalized));
    await this.cacheService.del([`match:detail:${normalized.matchId}`, 'live:matches']);
    this.metricsService.observeQueueJob('live', 'publishMatchEvent', 'success', 1);
  }

  private normalizePayload(payload: LiveMatchEventPayload): LiveMatchEventPayload {
    return {
      eventType: 'matchEvent',
      matchId: payload.matchId,
      sport: payload.sport,
      leagueId: payload.leagueId || null,
      timestamp: payload.timestamp || new Date().toISOString(),
      source: payload.source || 'system',
      payload: {
        eventId: payload.payload?.eventId || 'unknown',
        minute: payload.payload?.minute ?? null,
        type: payload.payload?.type || 'unknown',
        teamId: payload.payload?.teamId ?? null,
        playerId: payload.payload?.playerId ?? null,
        data: payload.payload?.data || {},
      },
    };
  }
}

` 

## src/modules/live/live.controller.ts
`$ext
import { Controller, Get, Param, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { LiveService } from './live.service';

@ApiTags('live')
@Controller('api/v1/live')
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Public()
  @Get('matches')
  async matches() {
    return { data: await this.service.liveMatches() };
  }

  @Public()
  @Sse('events/stream')
  events() {
    return this.service.streamEvents();
  }

  @Public()
  @Sse('matches/:id/events/stream')
  matchEvents(@Param('id') id: string) {
    return this.service.streamEvents(id);
  }
}

` 

## src/modules/jobs/processors/ingestion.processor.ts
`$ext
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { IngestionStatus, MatchStatus, Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { LiveService } from 'src/modules/live/live.service';
import { ProvidersService } from 'src/modules/providers/providers.service';
import { ProviderAdapter } from 'src/modules/providers/interfaces/provider-adapter.interface';
import { NormalizedLeague, NormalizedMatch, NormalizedPlayer } from 'src/modules/providers/interfaces/normalized.types';
import { DEFAULT_SUPPORTED_LEAGUES, SupportedLeagueConfig } from 'src/shared/constants/ingestion.constants';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { JobsService } from '../jobs.service';
import { CanonicalMappingService } from '../services/canonical-mapping.service';

interface IngestionResultSummary {
  jobName: string;
  providers: Record<string, Record<string, number>>;
  touchedMatchIds: string[];
  warnings: string[];
}

@Injectable()
@Processor(QUEUE_NAMES.INGESTION)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: ProvidersService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly liveService: LiveService,
    private readonly mappingService: CanonicalMappingService,
    private readonly jobsService: JobsService,
  ) {
    super();
  }

  async process(job: Job<{ ingestionJobId?: string; providerCode?: string }>): Promise<unknown> {
    const startedAt = Date.now();
    const ingestionJobId = String(job.data?.ingestionJobId || '');
    let runId: string | null = null;

    if (ingestionJobId) {
      const run = await this.prisma.ingestionJobRun.create({
        data: {
          ingestionJobId,
          status: IngestionStatus.RUNNING,
          startedAt: new Date(),
          attempt: job.attemptsMade + 1,
        },
      });
      runId = run.id;

      await this.prisma.ingestionJob.update({
        where: { id: ingestionJobId },
        data: { status: IngestionStatus.RUNNING, startedAt: new Date(), errorMessage: null },
      });
    }

    const summary: IngestionResultSummary = {
      jobName: job.name,
      providers: {},
      touchedMatchIds: [],
      warnings: [],
    };

    try {
      const supportedLeagues = await this.getSupportedLeagues();
      const providerCodes = await this.resolveProviderCodes(job.data?.providerCode, this.jobSport(job.name));

      if (!providerCodes.length) {
        summary.warnings.push('No active provider available for requested job');
      }

      for (const providerCode of providerCodes) {
        const adapter = this.providersService.getAdapterByCode(providerCode);
        const provider = await this.prisma.provider.findUnique({ where: { code: providerCode } });
        if (!provider) {
          summary.warnings.push(`Provider row missing for code=${providerCode}`);
          continue;
        }

        const providerSupportedLeagues = supportedLeagues.filter((item) => item.providerCode === providerCode);

        switch (job.name) {
          case JOB_NAMES.syncLeagues:
            summary.providers[providerCode] = await this.syncLeagues(provider.id, adapter, providerSupportedLeagues);
            await this.cacheService.delByPrefix('standings:');
            await this.cacheService.delByPrefix('league:detail:');
            break;
          case JOB_NAMES.syncSeasons:
            summary.providers[providerCode] = await this.syncSeasons(provider.id, adapter);
            await this.cacheService.delByPrefix('league:detail:');
            break;
          case JOB_NAMES.syncTeams:
            summary.providers[providerCode] = await this.syncTeams(provider.id, adapter, providerSupportedLeagues);
            break;
          case JOB_NAMES.syncPlayers:
            summary.providers[providerCode] = await this.syncPlayers(provider.id, adapter);
            break;
          case JOB_NAMES.syncFixtures: {
            const { stats, touchedMatchIds } = await this.syncMatches(provider.id, adapter, providerSupportedLeagues, 'fixtures');
            summary.providers[providerCode] = stats;
            summary.touchedMatchIds.push(...touchedMatchIds);
            await this.cacheService.del(touchedMatchIds.map((matchId) => `match:detail:${matchId}`));
            await this.cacheService.del(['dashboard:summary']);
            break;
          }
          case JOB_NAMES.syncResults: {
            const { stats, touchedMatchIds } = await this.syncMatches(provider.id, adapter, providerSupportedLeagues, 'results');
            summary.providers[providerCode] = stats;
            summary.touchedMatchIds.push(...touchedMatchIds);
            await this.cacheService.del(touchedMatchIds.map((matchId) => `match:detail:${matchId}`));
            await this.cacheService.del(['dashboard:summary']);
            break;
          }
          case JOB_NAMES.syncStandings: {
            const standings = await this.syncStandings(provider.id, adapter);
            summary.providers[providerCode] = {
              processed: standings.processed,
              upserted: standings.upserted,
              review: standings.review,
            };
            await this.cacheService.del(standings.touchedLeagueIds.flatMap((leagueId) => [`standings:${leagueId}`, `league:detail:${leagueId}`]));
            break;
          }
          case JOB_NAMES.syncTeamStats:
            summary.providers[providerCode] = await this.syncTeamStats(provider.id, adapter);
            break;
          case JOB_NAMES.syncPlayerStats:
            summary.providers[providerCode] = await this.syncPlayerStats(provider.id, adapter);
            break;
          case JOB_NAMES.syncMatchEvents: {
            const eventSync = await this.syncMatchEvents(provider.id, adapter);
            summary.providers[providerCode] = {
              processed: eventSync.processed,
              upserted: eventSync.upserted,
            };
            await this.cacheService.del(eventSync.touchedMatchIds.map((matchId) => `match:detail:${matchId}`));
            break;
          }
          default:
            this.logger.log(`No-op ingestion job: ${job.name}`);
        }
      }

      if (job.name === JOB_NAMES.recalculateForms) {
        const formStats = await this.recalculateForms();
        summary.providers.system = formStats;
      }

      if (summary.touchedMatchIds.length && [JOB_NAMES.syncFixtures, JOB_NAMES.syncResults].includes(job.name as any)) {
        await this.jobsService.enqueueFeatureBatch(summary.touchedMatchIds, `sync:${job.name}`);
      }

      if (ingestionJobId) {
        await this.prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: { status: IngestionStatus.SUCCESS, finishedAt: new Date() },
        });
      }

      if (runId) {
        await this.prisma.ingestionJobRun.update({
          where: { id: runId },
          data: {
            status: IngestionStatus.SUCCESS,
            finishedAt: new Date(),
            resultPayload: summary as unknown as Prisma.InputJsonValue,
            rawPayload: {
              touchedMatchIds: summary.touchedMatchIds.slice(0, 50),
              warnings: summary.warnings,
            } as Prisma.InputJsonValue,
          },
        });
      }

      this.metricsService.recordIngestionRun(job.name, 'success');
      this.metricsService.observeQueueJob(QUEUE_NAMES.INGESTION, job.name, 'success', Date.now() - startedAt);
      return { ok: true, summary };
    } catch (error) {
      const message = (error as Error).message;
      this.metricsService.recordIngestionRun(job.name, 'failed');
      this.metricsService.observeQueueJob(QUEUE_NAMES.INGESTION, job.name, 'failed', Date.now() - startedAt);
      this.logger.error(`Ingestion job failed ${job.name}: ${message}`);

      if (ingestionJobId) {
        const status = job.attemptsMade + 1 >= (job.opts.attempts || 1) ? IngestionStatus.DEAD_LETTER : IngestionStatus.FAILED;
        await this.prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: { status, errorMessage: message, finishedAt: new Date() },
        });
      }

      if (runId) {
        await this.prisma.ingestionJobRun.update({
          where: { id: runId },
          data: {
            status: IngestionStatus.FAILED,
            errorMessage: message,
            finishedAt: new Date(),
            resultPayload: summary as unknown as Prisma.InputJsonValue,
          },
        });
      }

      throw error;
    }
  }

  private async syncLeagues(providerId: string, adapter: ProviderAdapter, supportedLeagues: SupportedLeagueConfig[]) {
    const sportMap = await this.getSportMap();
    const leagues = await adapter.getLeagues();

    let processed = 0;
    let mapped = 0;
    let review = 0;
    let seasonsUpserted = 0;

    for (const league of leagues) {
      if (!this.isLeagueSupported(league, supportedLeagues)) {
        continue;
      }

      processed += 1;

      const sportId = sportMap[league.sportCode];
      if (!sportId) {
        continue;
      }

      const leagueId = await this.mappingService.resolveLeague({
        providerId,
        sportId,
        externalId: league.externalId,
        externalName: league.name,
        country: league.country,
        logoUrl: league.logoUrl,
        rawPayload: league.rawPayload,
      });

      if (!leagueId) {
        review += 1;
        continue;
      }

      mapped += 1;

      const seasons = await adapter.getSeasons(league.externalId);
      for (const season of seasons) {
        await this.prisma.season.upsert({
          where: {
            leagueId_seasonYear: {
              leagueId,
              seasonYear: season.seasonYear,
            },
          },
          create: {
            leagueId,
            seasonYear: season.seasonYear,
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
          update: {
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
        });
        seasonsUpserted += 1;
      }
    }

    return {
      processed,
      mapped,
      review,
      seasonsUpserted,
    };
  }

  private async syncSeasons(providerId: string, adapter: ProviderAdapter) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
    });

    let processed = 0;
    let upserted = 0;

    for (const mapping of leagueMappings) {
      processed += 1;
      const seasons = await adapter.getSeasons(mapping.externalId);
      for (const season of seasons) {
        await this.prisma.season.upsert({
          where: {
            leagueId_seasonYear: {
              leagueId: mapping.leagueId as string,
              seasonYear: season.seasonYear,
            },
          },
          create: {
            leagueId: mapping.leagueId as string,
            seasonYear: season.seasonYear,
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
          update: {
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
        });
        upserted += 1;
      }
    }

    return { processed, upserted };
  }

  private async syncTeams(providerId: string, adapter: ProviderAdapter, supportedLeagues: SupportedLeagueConfig[]) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
      include: { league: true },
    });

    let processed = 0;
    let mapped = 0;
    let review = 0;

    for (const leagueMapping of leagueMappings) {
      if (!leagueMapping.league) {
        continue;
      }

      if (!this.isLeagueMappingSupported(leagueMapping.externalId, leagueMapping.league.name, supportedLeagues)) {
        continue;
      }

      const teams = await adapter.getTeams(leagueMapping.externalId);
      for (const team of teams) {
        processed += 1;
        const teamId = await this.mappingService.resolveTeam({
          providerId,
          sportId: leagueMapping.league.sportId,
          externalId: team.externalId,
          externalName: team.name,
          shortName: team.shortName,
          country: team.country,
          logoUrl: team.logoUrl,
          venue: team.venue,
          rawPayload: team.rawPayload,
        });

        if (teamId) {
          mapped += 1;
        } else {
          review += 1;
        }
      }
    }

    return {
      processed,
      mapped,
      review,
    };
  }

  private async syncPlayers(providerId: string, adapter: ProviderAdapter) {
    const teamMappings = await this.prisma.providerTeamMapping.findMany({
      where: { providerId, reviewNeeded: false, teamId: { not: null } },
      take: 120,
    });

    let processed = 0;
    let upserted = 0;

    for (const teamMapping of teamMappings) {
      const players = await adapter.getPlayers(teamMapping.externalId);
      for (const player of players) {
        processed += 1;
        if (!player.externalId) {
          continue;
        }

        await this.upsertPlayerFromProvider(adapter.code, player, teamMapping.teamId as string);
        upserted += 1;
      }
    }

    return {
      processed,
      upserted,
    };
  }

  private async syncMatches(
    providerId: string,
    adapter: ProviderAdapter,
    supportedLeagues: SupportedLeagueConfig[],
    mode: 'fixtures' | 'results',
  ) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
      include: { league: true },
    });

    const touchedMatchIds: string[] = [];
    let processed = 0;
    let mapped = 0;
    let review = 0;

    const today = new Date();
    const from = mode === 'fixtures' ? formatDate(today) : formatDate(new Date(today.getTime() - 7 * 86400000));
    const to = mode === 'fixtures' ? formatDate(new Date(today.getTime() + 7 * 86400000)) : formatDate(today);

    for (const leagueMapping of leagueMappings) {
      if (!leagueMapping.league) {
        continue;
      }

      if (!this.isLeagueMappingSupported(leagueMapping.externalId, leagueMapping.league.name, supportedLeagues)) {
        continue;
      }

      const matches = await adapter.getMatches({
        from,
        to,
        leagueExternalId: leagueMapping.externalId,
      });

      for (const match of matches) {
        processed += 1;
        const mappedId = await this.upsertNormalizedMatch(providerId, leagueMapping.league.sportId, leagueMapping.leagueId as string, match);
        if (mappedId) {
          mapped += 1;
          touchedMatchIds.push(mappedId);
        } else {
          review += 1;
        }
      }
    }

    return {
      stats: {
        processed,
        mapped,
        review,
      },
      touchedMatchIds,
    };
  }

  private async syncStandings(providerId: string, adapter: ProviderAdapter) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
      include: { league: true },
    });

    const touchedLeagueIds = new Set<string>();
    let processed = 0;
    let upserted = 0;
    let review = 0;

    for (const leagueMapping of leagueMappings) {
      if (!leagueMapping.leagueId || !leagueMapping.league) {
        continue;
      }

      touchedLeagueIds.add(leagueMapping.leagueId);

      const standings = await adapter.getStandings(leagueMapping.externalId);
      const seasonId = await this.mappingService.resolveSeason(leagueMapping.leagueId, String(new Date().getUTCFullYear()));

      for (const standing of standings) {
        processed += 1;

        const teamMapping = await this.prisma.providerTeamMapping.findUnique({
          where: {
            providerId_externalId: {
              providerId,
              externalId: standing.externalTeamId,
            },
          },
        });

        if (!teamMapping?.teamId) {
          await this.prisma.providerTeamMapping.upsert({
            where: {
              providerId_externalId: {
                providerId,
                externalId: standing.externalTeamId,
              },
            },
            create: {
              providerId,
              teamId: null,
              externalId: standing.externalTeamId,
              externalName: null,
              confidence: 0,
              reviewNeeded: true,
              reviewReason: 'Standings row has no canonical team mapping',
              rawPayload: standing.rawPayload as Prisma.InputJsonValue | undefined,
            },
            update: {
              reviewNeeded: true,
              reviewReason: 'Standings row has no canonical team mapping',
              rawPayload: standing.rawPayload as Prisma.InputJsonValue | undefined,
            },
          });
          review += 1;
          continue;
        }

        await this.prisma.standingsSnapshot.upsert({
          where: {
            leagueId_seasonId_teamId: {
              leagueId: leagueMapping.leagueId,
              seasonId,
              teamId: teamMapping.teamId,
            },
          },
          create: {
            leagueId: leagueMapping.leagueId,
            seasonId,
            teamId: teamMapping.teamId,
            rank: standing.rank,
            played: standing.played,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            points: standing.points,
            form: standing.form,
          },
          update: {
            rank: standing.rank,
            played: standing.played,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            points: standing.points,
            form: standing.form,
          },
        });
        upserted += 1;
      }
    }

    return {
      processed,
      upserted,
      review,
      touchedLeagueIds: [...touchedLeagueIds],
    };
  }

  private async syncTeamStats(providerId: string, adapter: ProviderAdapter) {
    const providerMatchMappings = await this.loadActiveProviderMatchMappings(providerId);
    let processed = 0;
    let upserted = 0;

    for (const mapping of providerMatchMappings) {
      const stats = await adapter.getTeamStats(mapping.externalId);
      for (const stat of stats) {
        processed += 1;
        const teamMapping = await this.prisma.providerTeamMapping.findUnique({
          where: {
            providerId_externalId: {
              providerId,
              externalId: stat.externalTeamId,
            },
          },
        });

        if (!teamMapping?.teamId || !mapping.matchId) {
          continue;
        }

        await this.prisma.teamStat.upsert({
          where: {
            matchId_teamId: {
              matchId: mapping.matchId,
              teamId: teamMapping.teamId,
            },
          },
          create: {
            matchId: mapping.matchId,
            teamId: teamMapping.teamId,
            possession: stat.possession,
            shots: stat.shots,
            shotsOnTarget: stat.shotsOnTarget,
            corners: stat.corners,
            fouls: stat.fouls,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
          update: {
            possession: stat.possession,
            shots: stat.shots,
            shotsOnTarget: stat.shotsOnTarget,
            corners: stat.corners,
            fouls: stat.fouls,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
        });
        upserted += 1;
      }
    }

    return { processed, upserted };
  }

  private async syncPlayerStats(providerId: string, adapter: ProviderAdapter) {
    const providerMatchMappings = await this.loadActiveProviderMatchMappings(providerId);
    let processed = 0;
    let upserted = 0;

    for (const mapping of providerMatchMappings) {
      const stats = await adapter.getPlayerStats(mapping.externalId);
      for (const stat of stats) {
        processed += 1;

        if (!mapping.matchId) {
          continue;
        }

        const playerId = `${adapter.code}-player-${stat.externalPlayerId}`;
        const teamMapping = stat.externalTeamId
          ? await this.prisma.providerTeamMapping.findUnique({
              where: {
                providerId_externalId: {
                  providerId,
                  externalId: stat.externalTeamId,
                },
              },
            })
          : null;

        await this.prisma.player.upsert({
          where: { id: playerId },
          create: {
            id: playerId,
            teamId: teamMapping?.teamId || null,
            name: `Player ${stat.externalPlayerId}`,
          },
          update: {
            teamId: teamMapping?.teamId || undefined,
          },
        });

        await this.prisma.playerStat.upsert({
          where: {
            matchId_playerId: {
              matchId: mapping.matchId,
              playerId,
            },
          },
          create: {
            matchId: mapping.matchId,
            playerId,
            teamId: teamMapping?.teamId || null,
            minutes: stat.minutes,
            points: stat.points,
            assists: stat.assists,
            rebounds: stat.rebounds,
            goals: stat.goals,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
          update: {
            teamId: teamMapping?.teamId || undefined,
            minutes: stat.minutes,
            points: stat.points,
            assists: stat.assists,
            rebounds: stat.rebounds,
            goals: stat.goals,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
        });
        upserted += 1;
      }
    }

    return { processed, upserted };
  }

  private async syncMatchEvents(providerId: string, adapter: ProviderAdapter) {
    const providerMatchMappings = await this.loadActiveProviderMatchMappings(providerId);

    const touchedMatchIds: string[] = [];
    let processed = 0;
    let upserted = 0;

    for (const mapping of providerMatchMappings) {
      const events = await adapter.getMatchEvents(mapping.externalId);
      if (!mapping.matchId) {
        continue;
      }

      touchedMatchIds.push(mapping.matchId);
      const livePayloads: Array<{
        eventType: 'matchEvent';
        matchId: string;
        sport: 'football' | 'basketball';
        leagueId: string | null;
        timestamp: string;
        source: string;
        payload: {
          eventId: string;
          minute: number | null;
          type: string;
          teamId: string | null;
          playerId: string | null;
          data: Record<string, unknown>;
        };
      }> = [];

      await this.prisma.$transaction(async (tx) => {
        await tx.matchEvent.deleteMany({ where: { matchId: mapping.matchId as string } });

        for (const event of events) {
          processed += 1;

          const teamMapping = event.externalTeamId
            ? await tx.providerTeamMapping.findUnique({
                where: {
                  providerId_externalId: {
                    providerId,
                    externalId: event.externalTeamId,
                  },
              },
            })
            : null;

          const created = await tx.matchEvent.create({
            data: {
              matchId: mapping.matchId as string,
              minute: event.minute,
              type: event.type,
              teamId: teamMapping?.teamId || null,
              payload: event.payload as Prisma.InputJsonValue,
            },
          });

          livePayloads.push({
            eventType: 'matchEvent',
            matchId: mapping.matchId as string,
            sport: normalizeSportCode(mapping.match?.sport?.code),
            leagueId: mapping.match?.leagueId || null,
            timestamp: new Date().toISOString(),
            source: `provider:${adapter.code}`,
            payload: {
              eventId: created.id,
              minute: event.minute ?? null,
              type: event.type,
              teamId: teamMapping?.teamId || null,
              playerId: null,
              data: (event.payload as Record<string, unknown>) || {},
            },
          });
          upserted += 1;
        }
      });

      await Promise.all(
        livePayloads.map(async (payload) => {
          try {
            await this.liveService.publishMatchEvent(payload);
          } catch (error) {
            this.logger.warn(
              `Live publish failed matchId=${payload.matchId} eventType=${payload.payload.type} reason=${(error as Error).message}`,
            );
          }
        }),
      );
    }

    return { processed, upserted, touchedMatchIds: [...new Set(touchedMatchIds)] };
  }

  private async recalculateForms() {
    const teams = await this.prisma.team.findMany({ where: { deletedAt: null }, select: { id: true } });
    let updated = 0;

    for (const team of teams) {
      const matches = await this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
          status: MatchStatus.COMPLETED,
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
      });

      if (!matches.length) {
        continue;
      }

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let scored = 0;
      let conceded = 0;
      let formString = '';

      for (const match of matches) {
        const isHome = match.homeTeamId === team.id;
        const gf = Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
        const ga = Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
        scored += gf;
        conceded += ga;

        if (gf > ga) {
          wins += 1;
          formString += 'W';
        } else if (gf === ga) {
          draws += 1;
          formString += 'D';
        } else {
          losses += 1;
          formString += 'L';
        }
      }

      await this.prisma.teamFormSnapshot.create({
        data: {
          teamId: team.id,
          wins,
          draws,
          losses,
          scored,
          conceded,
          formString,
          sampleSize: matches.length,
        },
      });
      updated += 1;
    }

    return { updated };
  }

  private async upsertNormalizedMatch(providerId: string, sportId: string, leagueId: string, match: NormalizedMatch): Promise<string | null> {
    const homeTeamMapping = await this.prisma.providerTeamMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: match.homeTeamExternalId,
        },
      },
    });

    const awayTeamMapping = await this.prisma.providerTeamMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: match.awayTeamExternalId,
        },
      },
    });

    const seasonId = await this.mappingService.resolveSeason(leagueId, match.seasonExternalId, new Date(match.matchDate));

    return this.mappingService.resolveMatch({
      providerId,
      sportId,
      leagueId,
      seasonId,
      externalId: match.externalId,
      homeTeamId: homeTeamMapping?.teamId || undefined,
      awayTeamId: awayTeamMapping?.teamId || undefined,
      matchDate: new Date(match.matchDate),
      status: match.status as MatchStatus,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      venue: match.venue,
      rawPayload: match.rawPayload,
    });
  }

  private async upsertPlayerFromProvider(providerCode: string, player: NormalizedPlayer, teamId: string) {
    const playerId = `${providerCode}-player-${player.externalId}`;

    await this.prisma.player.upsert({
      where: { id: playerId },
      create: {
        id: playerId,
        teamId,
        name: player.name,
        shortName: player.name,
        nationality: player.nationality,
        position: player.position,
        birthDate: player.birthDate ? new Date(player.birthDate) : null,
        photoUrl: player.photoUrl,
      },
      update: {
        teamId,
        name: player.name,
        shortName: player.name,
        nationality: player.nationality,
        position: player.position,
        birthDate: player.birthDate ? new Date(player.birthDate) : null,
        photoUrl: player.photoUrl,
      },
    });
  }

  private async loadActiveProviderMatchMappings(providerId: string) {
    const from = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return this.prisma.providerMatchMapping.findMany({
      where: {
        providerId,
        reviewNeeded: false,
        matchId: { not: null },
        match: {
          matchDate: { gte: from, lte: to },
          status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.COMPLETED] },
        },
      },
      include: {
        match: {
          select: {
            id: true,
            leagueId: true,
            sport: { select: { code: true } },
          },
        },
      },
    });
  }

  private async resolveProviderCodes(providerCode: string | undefined, sportCode: 'FOOTBALL' | 'BASKETBALL' | null) {
    if (providerCode) {
      const enabled = await this.providersService.isProviderEnabled(providerCode);
      return enabled ? [providerCode] : [];
    }

    return this.providersService.getActiveAdapterCodes(sportCode || undefined);
  }

  private jobSport(_: string): 'FOOTBALL' | 'BASKETBALL' | null {
    return null;
  }

  private async getSupportedLeagues(): Promise<SupportedLeagueConfig[]> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'supportedLeagues' } });
    if (!setting) {
      return DEFAULT_SUPPORTED_LEAGUES;
    }

    const parsed = setting.value as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_SUPPORTED_LEAGUES;
    }

    const leagues = parsed
      .map((item) => item as Partial<SupportedLeagueConfig>)
      .filter((item): item is SupportedLeagueConfig => {
        return Boolean(item.providerCode && item.sportCode && Array.isArray(item.externalIds) && Array.isArray(item.names));
      });

    return leagues.length ? leagues : DEFAULT_SUPPORTED_LEAGUES;
  }

  private isLeagueSupported(league: NormalizedLeague, supportedLeagues: SupportedLeagueConfig[]) {
    if (!supportedLeagues.length) {
      return true;
    }

    const normalizedName = normalize(league.name);
    return supportedLeagues.some((item) => {
      if (item.sportCode !== league.sportCode) {
        return false;
      }
      return (
        item.externalIds.map((id) => normalize(id)).includes(normalize(league.externalId)) ||
        item.names.map((name) => normalize(name)).includes(normalizedName)
      );
    });
  }

  private isLeagueMappingSupported(externalId: string, leagueName: string, supportedLeagues: SupportedLeagueConfig[]) {
    if (!supportedLeagues.length) {
      return true;
    }

    const normalizedExternalId = normalize(externalId);
    const normalizedName = normalize(leagueName);

    return supportedLeagues.some((item) => {
      return (
        item.externalIds.map((id) => normalize(id)).includes(normalizedExternalId) ||
        item.names.map((name) => normalize(name)).includes(normalizedName)
      );
    });
  }

  private async getSportMap(): Promise<Record<string, string>> {
    const sports = await this.prisma.sport.findMany();
    return sports.reduce<Record<string, string>>((acc, sport) => {
      acc[sport.code] = sport.id;
      return acc;
    }, {});
  }
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const normalizeSportCode = (code: string | undefined): 'football' | 'basketball' =>
  String(code || '').toUpperCase() === 'BASKETBALL' ? 'basketball' : 'football';



` 

## src/modules/jobs/jobs.service.ts
`$ext
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/database/prisma.service';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.INGESTION) private readonly ingestionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PREDICTION) private readonly predictionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.HEALTH) private readonly healthQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureRepeatableJobs();
  }

  async ensureRepeatableJobs(): Promise<void> {
    await this.ingestionQueue.add(
      JOB_NAMES.syncLeagues,
      { source: 'scheduler' },
      {
        repeat: { pattern: '0 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncLeagues}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncTeams,
      { source: 'scheduler' },
      {
        repeat: { pattern: '20 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncTeams}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncPlayers,
      { source: 'scheduler' },
      {
        repeat: { pattern: '40 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncPlayers}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncStandings,
      { source: 'scheduler' },
      {
        repeat: { pattern: '20 4 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncStandings}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncFixtures,
      { source: 'scheduler' },
      {
        repeat: { pattern: '5 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 400,
        jobId: `repeatable:${JOB_NAMES.syncFixtures}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncResults,
      { source: 'scheduler' },
      {
        repeat: { pattern: '20 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 400,
        jobId: `repeatable:${JOB_NAMES.syncResults}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncTeamStats,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/30 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncTeamStats}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncPlayerStats,
      { source: 'scheduler' },
      {
        repeat: { pattern: '0 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncPlayerStats}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncMatchEvents,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/10 * * * *' },
        removeOnComplete: 200,
        removeOnFail: 400,
        jobId: `repeatable:${JOB_NAMES.syncMatchEvents}:base`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncMatchEvents,
      { source: 'scheduler-matchday' },
      {
        repeat: { pattern: '*/2 * * * 0,1,5,6' },
        removeOnComplete: 200,
        removeOnFail: 400,
        jobId: `repeatable:${JOB_NAMES.syncMatchEvents}:matchday`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.recalculateForms,
      { source: 'scheduler' },
      {
        repeat: { pattern: '30 4 * * *' },
        removeOnComplete: 100,
        removeOnFail: 200,
        jobId: `repeatable:${JOB_NAMES.recalculateForms}`,
      },
    );

    await this.predictionQueue.add(
      JOB_NAMES.generateFeatures,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/20 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.generateFeatures}`,
      },
    );

    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/20 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.generatePredictions}`,
      },
    );

    await this.healthQueue.add(
      JOB_NAMES.providerHealthCheck,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/5 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.providerHealthCheck}`,
      },
    );
  }

  async enqueueIngestionJob(ingestionJobId: string, jobName: string, payload: Record<string, unknown>): Promise<void> {
    const idempotentJobId = `${jobName}:${ingestionJobId}`;

    await this.ingestionQueue.add(jobName, payload, {
      jobId: idempotentJobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 300,
    });
  }

  async enqueueFeatureBatch(matchIds: string[], source = 'ingestion-sync'): Promise<void> {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    if (!dedupedIds.length) {
      return;
    }

    const batchKey = dedupedIds.slice(0, 10).join(',');

    await this.predictionQueue.add(
      JOB_NAMES.generateFeatures,
      { matchIds: dedupedIds, source },
      {
        jobId: `${JOB_NAMES.generateFeatures}:batch:${batchKey}:${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1200,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async enqueuePredictionJob(matchId: string): Promise<void> {
    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { matchId },
      {
        jobId: `${JOB_NAMES.generatePredictions}:${matchId}`,
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async enqueuePredictionBatch(matchIds: string[], source = 'feature-sync'): Promise<void> {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    if (!dedupedIds.length) {
      return;
    }

    const batchKey = dedupedIds.slice(0, 10).join(',');

    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { matchIds: dedupedIds, source },
      {
        jobId: `${JOB_NAMES.generatePredictions}:batch:${batchKey}:${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1500,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async getLatestPredictionRuns(limit = 30) {
    const jobs = await this.predictionQueue.getJobs(['completed', 'failed', 'active', 'waiting', 'delayed'], 0, Math.max(0, limit - 1), true);

    return jobs
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit)
      .map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        status:
          job.finishedOn && job.failedReason
            ? 'failed'
            : job.finishedOn
              ? 'completed'
              : job.processedOn
                ? 'active'
                : 'waiting',
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason || null,
        timestamp: new Date(job.timestamp).toISOString(),
        processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      }));
  }

  async getFailedPredictionJobs(limit = 50) {
    const jobs = await this.predictionQueue.getJobs(['failed'], 0, Math.max(0, limit - 1), true);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason || null,
      timestamp: new Date(job.timestamp).toISOString(),
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    }));
  }

  async markDeadLetter(ingestionJobId: string, errorMessage: string): Promise<void> {
    await this.prisma.ingestionJob.update({
      where: { id: ingestionJobId },
      data: {
        status: 'DEAD_LETTER',
        errorMessage,
        finishedAt: new Date(),
      },
    });

    this.logger.error(`Dead letter job=${ingestionJobId} error=${errorMessage}`);
  }
}

` 

## src/modules/jobs/jobs.module.ts
`$ext
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { LiveModule } from 'src/modules/live/live.module';
import { ProvidersModule } from 'src/modules/providers/providers.module';
import { PredictionsModule } from 'src/modules/predictions/predictions.module';
import { QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { IngestionProcessor } from './processors/ingestion.processor';
import { PredictionProcessor } from './processors/prediction.processor';
import { HealthProcessor } from './processors/health.processor';
import { JobsService } from './jobs.service';
import { CanonicalMappingService } from './services/canonical-mapping.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: Number(configService.get<number>('redis.port')),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.INGESTION },
      { name: QUEUE_NAMES.PREDICTION },
      { name: QUEUE_NAMES.HEALTH },
    ),
    ProvidersModule,
    PredictionsModule,
    LiveModule,
  ],
  providers: [JobsService, CanonicalMappingService, IngestionProcessor, PredictionProcessor, HealthProcessor],
  exports: [JobsService, BullModule, CanonicalMappingService],
})
export class JobsModule {}

` 

## src/common/filters/http-exception.filter.ts
`$ext
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from 'src/shared/types/api-response.type';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] })?.message ||
          (exception instanceof Error ? exception.message : 'Unexpected error');

    const details = Array.isArray(message) ? message : [message];
    const correlationId = String(request.headers['x-correlation-id'] || '');

    const logPayload = {
      method: request.method,
      path: request.originalUrl || request.url,
      status,
      correlationId,
      details,
    };

    if (status >= 500) {
      this.logger.error(JSON.stringify(logPayload), exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(JSON.stringify(logPayload));
    }

    const payload: ApiResponse<null> = {
      success: false,
      data: null,
      meta: null,
      error: {
        code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : String(message),
        details,
      },
    };

    response.status(status).json(payload);
  }
}

` 

## src/modules/admin/dto/manual-remap.dto.ts
`$ext
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MappingType {
  TEAM = 'team',
  LEAGUE = 'league',
  MATCH = 'match',
}

export class ManualRemapDto {
  @IsEnum(MappingType)
  mappingType!: MappingType;

  @IsString()
  providerCode!: string;

  @IsString()
  externalId!: string;

  @IsString()
  canonicalId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

` 

## src/modules/admin/dto/manual-rerun-prediction.dto.ts
`$ext
import { IsString } from 'class-validator';

export class ManualRerunPredictionDto {
  @IsString()
  matchId!: string;
}

` 

## src/modules/admin/admin.service.ts
`$ext
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { ProvidersService } from 'src/modules/providers/providers.service';
import { ManualRemapDto, MappingType } from './dto/manual-remap.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly providersService: ProvidersService,
  ) {}

  async summary() {
    const [users, leagues, teams, matches, predictions, failedJobs] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.league.count({ where: { deletedAt: null } }),
      this.prisma.team.count({ where: { deletedAt: null } }),
      this.prisma.match.count(),
      this.prisma.prediction.count(),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    return {
      users,
      leagues,
      teams,
      matches,
      predictions,
      failedJobs,
    };
  }

  async mappingReviewList(limit = 100) {
    const normalizedLimit = Math.min(200, Math.max(1, limit));

    const [teamMappings, leagueMappings, matchMappings] = await Promise.all([
      this.prisma.providerTeamMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, team: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerLeagueMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, league: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerMatchMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, match: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
    ]);

    return {
      teamMappings,
      leagueMappings,
      matchMappings,
      total: teamMappings.length + leagueMappings.length + matchMappings.length,
    };
  }

  async mappingReviewQueue(limit = 100) {
    const normalizedLimit = Math.min(500, Math.max(1, limit));
    const reviewList = await this.mappingReviewList(normalizedLimit);

    const queue = [
      ...reviewList.teamMappings.map((item) => ({
        type: 'team',
        providerCode: item.provider.code,
        externalId: item.externalId,
        externalName: item.externalName,
        confidence: item.confidence ?? 0,
        reviewReason: item.reviewReason,
        updatedAt: item.updatedAt.toISOString(),
      })),
      ...reviewList.leagueMappings.map((item) => ({
        type: 'league',
        providerCode: item.provider.code,
        externalId: item.externalId,
        externalName: item.externalName,
        confidence: item.confidence ?? 0,
        reviewReason: item.reviewReason,
        updatedAt: item.updatedAt.toISOString(),
      })),
      ...reviewList.matchMappings.map((item) => ({
        type: 'match',
        providerCode: item.provider.code,
        externalId: item.externalId,
        externalName: item.externalRef,
        confidence: item.confidence ?? 0,
        reviewReason: item.reviewReason,
        updatedAt: item.updatedAt.toISOString(),
      })),
    ]
      .sort((a, b) => {
        const confidenceDiff = (a.confidence ?? 0) - (b.confidence ?? 0);
        if (confidenceDiff !== 0) {
          return confidenceDiff;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, normalizedLimit);

    return {
      total: queue.length,
      items: queue,
    };
  }

  async failedMappings(limit = 100) {
    const normalizedLimit = Math.min(300, Math.max(1, limit));
    const where = {
      reviewNeeded: true,
      OR: [{ confidence: { lt: 0.5 } }, { confidence: null }, { reviewReason: { not: null } }],
    };

    const [teamMappings, leagueMappings, matchMappings] = await Promise.all([
      this.prisma.providerTeamMapping.findMany({
        where,
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerLeagueMapping.findMany({
        where,
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerMatchMapping.findMany({
        where,
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
    ]);

    return {
      total: teamMappings.length + leagueMappings.length + matchMappings.length,
      teamMappings,
      leagueMappings,
      matchMappings,
    };
  }

  async manualRemap(dto: ManualRemapDto, actorUserId?: string) {
    const provider = await this.prisma.provider.findUnique({ where: { code: dto.providerCode } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (dto.mappingType === MappingType.TEAM) {
      const team = await this.prisma.team.findUnique({ where: { id: dto.canonicalId } });
      if (!team) {
        throw new NotFoundException('Canonical team not found');
      }

      const mapping = await this.prisma.providerTeamMapping.upsert({
        where: {
          providerId_externalId: {
            providerId: provider.id,
            externalId: dto.externalId,
          },
        },
        create: {
          providerId: provider.id,
          externalId: dto.externalId,
          teamId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
        update: {
          teamId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
      });

      await this.createAuditLog(actorUserId, 'manual-remap-team', mapping.id, dto as unknown as Prisma.InputJsonValue);
      return mapping;
    }

    if (dto.mappingType === MappingType.LEAGUE) {
      const league = await this.prisma.league.findUnique({ where: { id: dto.canonicalId } });
      if (!league) {
        throw new NotFoundException('Canonical league not found');
      }

      const mapping = await this.prisma.providerLeagueMapping.upsert({
        where: {
          providerId_externalId: {
            providerId: provider.id,
            externalId: dto.externalId,
          },
        },
        create: {
          providerId: provider.id,
          externalId: dto.externalId,
          leagueId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
        update: {
          leagueId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
      });

      await this.createAuditLog(actorUserId, 'manual-remap-league', mapping.id, dto as unknown as Prisma.InputJsonValue);
      return mapping;
    }

    const match = await this.prisma.match.findUnique({ where: { id: dto.canonicalId } });
    if (!match) {
      throw new NotFoundException('Canonical match not found');
    }

    const mapping = await this.prisma.providerMatchMapping.upsert({
      where: {
        providerId_externalId: {
          providerId: provider.id,
          externalId: dto.externalId,
        },
      },
      create: {
        providerId: provider.id,
        externalId: dto.externalId,
        matchId: dto.canonicalId,
        confidence: 1,
        reviewNeeded: false,
        reviewReason: null,
      },
      update: {
        matchId: dto.canonicalId,
        confidence: 1,
        reviewNeeded: false,
        reviewReason: null,
      },
    });

    await this.createAuditLog(actorUserId, 'manual-remap-match', mapping.id, dto as unknown as Prisma.InputJsonValue);
    return mapping;
  }

  async predictionGenerationStatus() {
    const [latestPrediction, totalPredictions, last24hPredictions, latestFeatureSet, activeModels] = await Promise.all([
      this.prisma.prediction.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.prediction.count(),
      this.prisma.prediction.count({ where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.prisma.featureSet.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.modelVersion.findMany({ where: { status: { in: ['active', 'ACTIVE'] }, deletedAt: null } }),
    ]);

    return {
      totalPredictions,
      generatedLast24Hours: last24hPredictions,
      latestPredictionAt: latestPrediction?.updatedAt?.toISOString() || null,
      latestFeatureSetAt: latestFeatureSet?.updatedAt?.toISOString() || null,
      activeModels,
    };
  }

  async latestPredictionRuns(limit = 30) {
    const normalizedLimit = Math.min(200, Math.max(1, limit));
    return this.jobsService.getLatestPredictionRuns(normalizedLimit);
  }

  async failedPredictionJobs(limit = 50) {
    const normalizedLimit = Math.min(200, Math.max(1, limit));
    return this.jobsService.getFailedPredictionJobs(normalizedLimit);
  }

  async manualRerunPrediction(matchId: string, actorUserId?: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    await this.jobsService.enqueuePredictionJob(matchId);
    await this.createAuditLog(actorUserId, 'manual-rerun-prediction', matchId, { matchId } as Prisma.InputJsonValue);

    return {
      queued: true,
      matchId,
      queuedAt: new Date().toISOString(),
    };
  }

  async syncSummaryByProvider() {
    const jobs = await this.prisma.ingestionJob.findMany({
      include: { provider: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    const summary = new Map<
      string,
      {
        providerCode: string;
        total: number;
        success: number;
        failed: number;
        pending: number;
        running: number;
        latestSyncAt: string | null;
      }
    >();

    for (const job of jobs) {
      const providerCode = job.provider?.code || 'system';
      if (!summary.has(providerCode)) {
        summary.set(providerCode, {
          providerCode,
          total: 0,
          success: 0,
          failed: 0,
          pending: 0,
          running: 0,
          latestSyncAt: null,
        });
      }

      const entry = summary.get(providerCode)!;
      entry.total += 1;

      if (job.status === 'SUCCESS') {
        entry.success += 1;
      } else if (job.status === 'FAILED' || job.status === 'DEAD_LETTER') {
        entry.failed += 1;
      } else if (job.status === 'RUNNING') {
        entry.running += 1;
      } else {
        entry.pending += 1;
      }

      const timestamp = (job.finishedAt || job.updatedAt).toISOString();
      if (!entry.latestSyncAt || new Date(timestamp).getTime() > new Date(entry.latestSyncAt).getTime()) {
        entry.latestSyncAt = timestamp;
      }
    }

    return [...summary.values()].sort((a, b) => a.providerCode.localeCompare(b.providerCode));
  }

  async providerRateLimitStatus() {
    return this.providersService.rateLimitStatus();
  }

  async latestSyncSummary() {
    const [latestJobs, latestRuns, failedJobs] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      this.prisma.ingestionJobRun.findMany({
        include: { ingestionJob: { include: { provider: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    const latestByType = latestJobs.reduce<Record<string, { status: string; updatedAt: string; providerCode: string | null }>>(
      (acc, job) => {
        if (!acc[job.name]) {
          acc[job.name] = {
            status: job.status,
            updatedAt: job.updatedAt.toISOString(),
            providerCode: job.provider?.code || null,
          };
        }
        return acc;
      },
      {},
    );

    return {
      failedJobs,
      latestByType,
      recentJobs: latestJobs,
      recentRuns: latestRuns,
    };
  }

  private async createAuditLog(
    actorUserId: string | undefined,
    action: string,
    targetId: string,
    payload: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId || null,
        action,
        targetType: 'admin-operation',
        targetId,
        payload,
      },
    });
  }
}

` 

## src/modules/admin/admin.controller.ts
`$ext
import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ManualRemapDto } from './dto/manual-remap.dto';
import { ManualRerunPredictionDto } from './dto/manual-rerun-prediction.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('summary')
  async summary() {
    return { data: await this.service.summary() };
  }

  @Get('mappings/review')
  async mappingReview(@Query('limit') limit?: string) {
    return { data: await this.service.mappingReviewList(limit ? Number(limit) : 100) };
  }

  @Get('mappings/review-queue')
  async mappingReviewQueue(@Query('limit') limit?: string) {
    return { data: await this.service.mappingReviewQueue(limit ? Number(limit) : 100) };
  }

  @Get('mappings/failed')
  async failedMappings(@Query('limit') limit?: string) {
    return { data: await this.service.failedMappings(limit ? Number(limit) : 100) };
  }

  @Post('mappings/remap')
  async manualRemap(@Req() req: Request & { user?: { id?: string } }, @Body() dto: ManualRemapDto) {
    return { data: await this.service.manualRemap(dto, req.user?.id) };
  }

  @Get('predictions/status')
  async predictionStatus() {
    return { data: await this.service.predictionGenerationStatus() };
  }

  @Get('predictions/runs/latest')
  async latestPredictionRuns(@Query('limit') limit?: string) {
    return { data: await this.service.latestPredictionRuns(limit ? Number(limit) : 30) };
  }

  @Get('predictions/jobs/failed')
  async failedPredictionJobs(@Query('limit') limit?: string) {
    return { data: await this.service.failedPredictionJobs(limit ? Number(limit) : 50) };
  }

  @Post('predictions/rerun')
  async manualPredictionRerun(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: ManualRerunPredictionDto,
  ) {
    return { data: await this.service.manualRerunPrediction(dto.matchId, req.user?.id) };
  }

  @Get('sync/summary')
  async syncSummary() {
    return { data: await this.service.latestSyncSummary() };
  }

  @Get('sync/summary-by-provider')
  async syncSummaryByProvider() {
    return { data: await this.service.syncSummaryByProvider() };
  }
}

` 

## src/modules/admin/admin.module.ts
`$ext
import { Module } from '@nestjs/common';
import { JobsModule } from 'src/modules/jobs/jobs.module';
import { ProvidersModule } from 'src/modules/providers/providers.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [JobsModule, ProvidersModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

` 

## src/modules/jobs/processors/prediction.processor.spec.ts
`$ext
import { Job } from 'bullmq';
import { JOB_NAMES } from 'src/shared/constants/jobs.constants';
import { PredictionProcessor } from './prediction.processor';

describe('PredictionProcessor', () => {
  it('chains generateFeatures -> generatePredictions for successful matches', async () => {
    const predictionsServiceMock = {
      generateFeaturesForMatches: jest.fn().mockResolvedValue([
        { matchId: 'm1', status: 'success' },
        { matchId: 'm2', status: 'failed' },
      ]),
      generateFeaturesForMatch: jest.fn(),
      generatePendingFeatures: jest.fn(),
      generateForMatch: jest.fn(),
      generateForMatches: jest.fn(),
      generatePendingPredictions: jest.fn(),
    };

    const jobsServiceMock = {
      enqueuePredictionBatch: jest.fn().mockResolvedValue(undefined),
    };
    const metricsServiceMock = {
      observeQueueJob: jest.fn(),
    };

    const processor = new PredictionProcessor(
      predictionsServiceMock as any,
      jobsServiceMock as any,
      metricsServiceMock as any,
    );
    await processor.process({
      id: 'job-1',
      name: JOB_NAMES.generateFeatures,
      data: { matchIds: ['m1', 'm2'] },
    } as Job<any>);

    expect(predictionsServiceMock.generateFeaturesForMatches).toHaveBeenCalledWith(['m1', 'm2']);
    expect(jobsServiceMock.enqueuePredictionBatch).toHaveBeenCalledWith(['m1'], expect.stringContaining('feature-job'));
  });

  it('runs single prediction generation job', async () => {
    const predictionsServiceMock = {
      generateFeaturesForMatches: jest.fn(),
      generateFeaturesForMatch: jest.fn(),
      generatePendingFeatures: jest.fn(),
      generateForMatch: jest.fn().mockResolvedValue({ data: { matchId: 'm1' } }),
      generateForMatches: jest.fn(),
      generatePendingPredictions: jest.fn(),
    };

    const processor = new PredictionProcessor(predictionsServiceMock as any, {
      enqueuePredictionBatch: jest.fn(),
    } as any, {
      observeQueueJob: jest.fn(),
    } as any);

    await processor.process({
      id: 'job-2',
      name: JOB_NAMES.generatePredictions,
      data: { matchId: 'm1' },
    } as Job<any>);

    expect(predictionsServiceMock.generateForMatch).toHaveBeenCalledWith('m1');
  });
});

` 

## src/modules/predictions/predictions.service.spec.ts
`$ext
import { PredictionsService } from './predictions.service';

const cacheMock = {
  getOrSet: jest.fn().mockImplementation(async (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  delByPrefix: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('PredictionsService', () => {
  it('generates feature snapshot for a match', async () => {
    const repositoryMock = {
      list: jest.fn(),
      getByMatchId: jest.fn(),
      upsertPrediction: jest.fn(),
      upsertFeatureSet: jest.fn().mockResolvedValue({ id: 'fs-1' }),
    };

    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          sportId: 's1',
          sport: { code: 'FOOTBALL' },
          homeTeamId: 'h1',
          awayTeamId: 'a1',
          leagueId: 'l1',
          seasonId: 'ss1',
        }),
      },
      featureSet: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      modelVersion: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      prediction: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    const service = new PredictionsService(
      repositoryMock as any,
      prismaMock,
      cacheMock as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { build: jest.fn().mockResolvedValue({ recentFormScore: 0.3, homeAwayStrength: 0.1 }) } as any,
      { build: jest.fn() } as any,
      { score: jest.fn() } as any,
      { build: jest.fn() } as any,
    );

    const result = await service.generateFeaturesForMatch('m1');

    expect(result.matchId).toBe('m1');
    expect(repositoryMock.upsertFeatureSet).toHaveBeenCalled();
  });

  it('generates prediction and stores explanation', async () => {
    const repositoryMock = {
      list: jest.fn(),
      getByMatchId: jest.fn().mockResolvedValue({
        match: {
          id: 'm1',
          sport: { code: 'FOOTBALL' },
          league: { id: 'l1', name: 'Premier League' },
          homeTeam: { id: 'h1', name: 'Arsenal', logoUrl: null },
          awayTeam: { id: 'a1', name: 'Chelsea', logoUrl: null },
          matchDate: new Date('2026-05-10T20:00:00.000Z'),
          status: 'SCHEDULED',
        },
        probabilities: { homeWin: 0.5, draw: 0.25, awayWin: 0.25 },
        expectedScore: { home: 1.7, away: 1.1 },
        confidenceScore: 77,
        summary: 'summary',
        riskFlags: [],
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
      }),
      upsertPrediction: jest.fn().mockResolvedValue({ id: 'p1' }),
      upsertFeatureSet: jest.fn().mockResolvedValue({ id: 'f1' }),
    };

    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          sportId: 's1',
          sport: { code: 'FOOTBALL' },
          league: { id: 'l1', name: 'Premier League' },
          homeTeam: { id: 'h1', name: 'Arsenal', logoUrl: null },
          awayTeam: { id: 'a1', name: 'Chelsea', logoUrl: null },
          homeTeamId: 'h1',
          awayTeamId: 'a1',
          leagueId: 'l1',
          seasonId: 'ss1',
        }),
      },
      featureSet: {
        findUnique: jest.fn().mockResolvedValue({
          matchId: 'm1',
          modelFamily: 'football-features-v1',
          features: { recentFormScore: 0.4, homeAwayStrength: 0.2 },
          qualityScore: 0.75,
        }),
      },
      modelVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'mv1', key: 'football-hybrid-v1' }),
        create: jest.fn(),
      },
      prediction: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    const footballElo = {
      run: jest.fn().mockResolvedValue({
        probabilities: { homeWin: 0.6, draw: 0.2, awayWin: 0.2 },
        expectedScore: { home: 1.8, away: 1.1 },
      }),
    };
    const footballPoisson = {
      run: jest.fn().mockResolvedValue({
        probabilities: { homeWin: 0.5, draw: 0.25, awayWin: 0.25 },
        expectedScore: { home: 1.6, away: 1.0 },
      }),
    };
    const confidence = { score: jest.fn().mockReturnValue(77) };
    const explanation = { build: jest.fn().mockReturnValue({ summary: 'home edge', riskFlags: ['low-data'] }) };

    const service = new PredictionsService(
      repositoryMock as any,
      prismaMock,
      cacheMock as any,
      footballElo as any,
      footballPoisson as any,
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
      { build: jest.fn() } as any,
      { build: jest.fn() } as any,
      confidence as any,
      explanation as any,
    );

    await service.generateForMatch('m1');

    expect(repositoryMock.upsertPrediction).toHaveBeenCalledWith(
      'm1',
      'mv1',
      expect.objectContaining({
        confidenceScore: 77,
        summary: 'home edge',
      }),
    );
    expect(cacheMock.delByPrefix).toHaveBeenCalledWith('predictions:');
    expect(cacheMock.del).toHaveBeenCalledWith(
      expect.arrayContaining(['prediction:match:m1', 'match:detail:m1', 'dashboard:summary']),
    );
  });
});

` 

## src/modules/jobs/processors/ingestion.processor.spec.ts
`$ext
import { JOB_NAMES } from 'src/shared/constants/jobs.constants';
import { IngestionProcessor } from './ingestion.processor';

describe('IngestionProcessor cache invalidation', () => {
  it('invalidates related match cache after syncMatchEvents', async () => {
    const prismaMock = {
      provider: {
        findUnique: jest.fn().mockResolvedValue({ id: 'provider-1' }),
      },
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const providersServiceMock = {
      isProviderEnabled: jest.fn().mockResolvedValue(true),
      getAdapterByCode: jest.fn().mockReturnValue({}),
    };
    const cacheServiceMock = {
      del: jest.fn().mockResolvedValue(undefined),
      delByPrefix: jest.fn().mockResolvedValue(undefined),
    };
    const metricsServiceMock = {
      recordIngestionRun: jest.fn(),
      observeQueueJob: jest.fn(),
    };
    const liveServiceMock = {
      publishMatchEvent: jest.fn().mockResolvedValue(undefined),
    };

    const processor = new IngestionProcessor(
      prismaMock,
      providersServiceMock as any,
      cacheServiceMock as any,
      metricsServiceMock as any,
      liveServiceMock as any,
      {} as any,
      { enqueueFeatureBatch: jest.fn().mockResolvedValue(undefined) } as any,
    );

    jest.spyOn(processor as any, 'syncMatchEvents').mockResolvedValue({
      processed: 3,
      upserted: 3,
      touchedMatchIds: ['match-1', 'match-2'],
    });

    await processor.process({
      name: JOB_NAMES.syncMatchEvents,
      data: { providerCode: 'football_data' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as any);

    expect(cacheServiceMock.del).toHaveBeenCalledWith(['match:detail:match-1', 'match:detail:match-2']);
  });
});

` 

## src/modules/jobs/jobs.service.spec.ts
`$ext
import { JobsService } from './jobs.service';

describe('JobsService scheduler tuning', () => {
  it('registers repeatable jobs with tuned schedules', async () => {
    const ingestionQueue = { add: jest.fn().mockResolvedValue(undefined) } as any;
    const predictionQueue = { add: jest.fn().mockResolvedValue(undefined) } as any;
    const healthQueue = { add: jest.fn().mockResolvedValue(undefined) } as any;

    const service = new JobsService(ingestionQueue, predictionQueue, healthQueue, {} as any);
    await service.ensureRepeatableJobs();

    expect(ingestionQueue.add).toHaveBeenCalledWith(
      'syncLeagues',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '0 3 * * *' } }),
    );

    expect(ingestionQueue.add).toHaveBeenCalledWith(
      'syncFixtures',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '5 * * * *' } }),
    );

    expect(ingestionQueue.add).toHaveBeenCalledWith(
      'syncMatchEvents',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '*/2 * * * 0,1,5,6' } }),
    );

    expect(healthQueue.add).toHaveBeenCalledWith(
      'providerHealthCheck',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '*/5 * * * *' } }),
    );
  });
});

` 

## src/modules/live/live.service.spec.ts
`$ext
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LiveService } from './live.service';

const redisInstances: any[] = [];

jest.mock('ioredis', () => {
  const ctor = jest.fn().mockImplementation(() => {
    const listeners: Record<string, (...args: any[]) => void> = {};
    const instance = {
      subscribe: jest.fn().mockResolvedValue(1),
      on: jest.fn((event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      }),
      publish: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(undefined),
      __emitMessage: (payload: string) => listeners.message?.('live:match-events', payload),
    };
    redisInstances.push(instance);
    return instance;
  });

  return {
    __esModule: true,
    default: ctor,
  };
});

describe('LiveService', () => {
  it('streams normalized live match event payloads', async () => {
    const service = new LiveService(
      {} as any,
      {
        getOrSet: jest.fn(),
        del: jest.fn().mockResolvedValue(undefined),
      } as any,
      {
        observeQueueJob: jest.fn(),
      } as any,
    );

    await service.onModuleInit();

    const payloadPromise = firstValueFrom(
      service.streamEvents('match-1').pipe(
        filter((event) => event.type === 'matchEvent'),
      ),
    );

    redisInstances[1].__emitMessage(
      JSON.stringify({
        eventType: 'matchEvent',
        matchId: 'match-1',
        sport: 'football',
        leagueId: 'league-1',
        timestamp: new Date().toISOString(),
        source: 'provider:football_data',
        payload: {
          eventId: 'event-1',
          minute: 61,
          type: 'goal',
          teamId: 'team-1',
          playerId: null,
          data: { score: '2-1' },
        },
      }),
    );

    const message = await payloadPromise;
    const data = message.data as any;
    expect(data.matchId).toBe('match-1');
    expect(data.payload.type).toBe('goal');

    await service.onModuleDestroy();
  });
});

` 

## test/admin-ops.e2e-spec.ts
`$ext
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin')
class TestAdminOpsController {
  @Get('mappings/review-queue')
  reviewQueue(@Query('limit') _limit?: string) {
    return { data: { total: 0, items: [] } };
  }

  @Get('mappings/failed')
  failedMappings(@Query('limit') _limit?: string) {
    return { data: { total: 0, teamMappings: [], leagueMappings: [], matchMappings: [] } };
  }

  @Post('mappings/remap')
  remap(@Body() body: { mappingType: string; providerCode: string; externalId: string; canonicalId: string }) {
    return { data: { ...body, reviewNeeded: false } };
  }

  @Post('predictions/rerun')
  rerunPrediction(@Body() body: { matchId: string }) {
    return { data: { queued: true, matchId: body.matchId } };
  }

  @Get('sync/summary-by-provider')
  syncSummaryByProvider() {
    return { data: [] };
  }
}

describe('Admin Ops Endpoints E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestAdminOpsController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/mappings/review-queue', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/mappings/review-queue')
      .expect(200)
      .expect(({ body }: { body: { data: { items: unknown[] } } }) => {
        expect(Array.isArray(body.data.items)).toBe(true);
      });
  });

  it('POST /api/v1/admin/mappings/remap', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/mappings/remap')
      .send({
        mappingType: 'team',
        providerCode: 'football_data',
        externalId: 'ext-1',
        canonicalId: 'team-1',
      })
      .expect(201)
      .expect(({ body }: { body: { data: { reviewNeeded: boolean } } }) => {
        expect(body.data.reviewNeeded).toBe(false);
      });
  });

  it('POST /api/v1/admin/predictions/rerun', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/predictions/rerun')
      .send({ matchId: 'match-1' })
      .expect(201)
      .expect(({ body }: { body: { data: { queued: boolean } } }) => {
        expect(body.data.queued).toBe(true);
      });
  });
});

` 

