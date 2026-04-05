import { Injectable, Logger } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { CACHE_TTL_SECONDS } from 'src/shared/constants/cache.constants';
import { PROVIDER_CODE_TO_SPORT, PROVIDER_POLICIES, ProviderPolicy } from 'src/shared/constants/provider.constants';
import { ApiFootballProviderAdapter } from './adapters/api-football.adapter';
import { BallDontLieProviderAdapter } from './adapters/ball-dont-lie.adapter';
import { FootballDataProviderAdapter } from './adapters/football-data.adapter';
import { TheSportsDbProviderAdapter } from './adapters/the-sports-db.adapter';
import { BaseProviderHttpClient } from './clients/base-provider.client';
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
    const key = CacheKeys.providerHealth();

    if (forceRefresh) {
      await this.cacheService.del([key]);
      const data = await this.computeHealth();
      await this.cacheService.set(key, data, CACHE_TTL_SECONDS.providerHealth);
      return data;
    }

    return this.cacheService.getOrSet(key, CACHE_TTL_SECONDS.providerHealth, () => this.computeHealth());
  }

  async rateLimitStatus() {
    return this.cacheService.getOrSet(CacheKeys.providerRateLimit(), CACHE_TTL_SECONDS.providerRateLimit, async () => {
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
        const runtime = BaseProviderHttpClient.runtimeStatus(provider.code);
        this.metricsService.setProviderCircuitState(provider.code, runtime.circuitState);

        return {
          providerId: provider.id,
          providerCode: provider.code,
          limitPerMinute,
          usedInLastMinute,
          remainingEstimate: Math.max(0, limitPerMinute - usedInLastMinute),
          utilizationPercent,
          throttledRecently: latest429ByProvider.has(provider.id),
          last429At: latest429ByProvider.get(provider.id) || null,
          runtime,
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

    await this.cacheService.del([CacheKeys.providerRateLimit()]);
  }

  private async computeHealth() {
    const runtimes = await this.loadProviderRuntime();
    const checks = await Promise.all(
      runtimes.map(async (runtime) => {
        const runtimeStatus = BaseProviderHttpClient.runtimeStatus(runtime.adapter.code);
        this.metricsService.setProviderCircuitState(runtime.adapter.code, runtimeStatus.circuitState);
        if (!runtime.enabled) {
          return {
            provider: runtime.adapter.code,
            healthy: false,
            latencyMs: 0,
            enabled: false,
            hasApiKey: runtime.hasApiKey,
            message: runtime.reason || 'Provider is disabled',
            runtimeStatus,
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
            runtimeStatus,
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
            runtimeStatus,
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
