import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AlertingService } from 'src/common/alerts/alerting.service';
import { PrismaService } from 'src/database/prisma.service';
import { ProvidersService } from 'src/modules/providers/providers.service';
import { QUEUE_NAMES } from 'src/shared/constants/jobs.constants';

type HealthCheckResult = {
  status: 'ok' | 'error';
  details?: Record<string, unknown>;
  message?: string;
};

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: ProvidersService,
    private readonly alertingService: AlertingService,
    configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.INGESTION) private readonly ingestionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PREDICTION) private readonly predictionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.HEALTH) private readonly healthQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DEAD_LETTER) private readonly deadLetterQueue: Queue,
  ) {
    const redisUrl = configService.get<string>('redis.url');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true });
      return;
    }

    this.redis = new Redis({
      host: configService.get<string>('redis.host') || process.env.REDIS_HOST || '127.0.0.1',
      port: Number(configService.get<number>('redis.port') || process.env.REDIS_PORT || 6379),
      password: configService.get<string>('redis.password') || process.env.REDIS_PASSWORD || undefined,
      ...(Boolean(configService.get<boolean>('redis.tlsEnabled')) ? { tls: { rejectUnauthorized: false } } : {}),
      lazyConnect: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === 'ready' || this.redis.status === 'connecting') {
      await this.redis.quit();
    }
  }

  async appHealth() {
    return {
      status: 'ok',
      service: 'tahminx-backend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      role: process.env.APP_ROLE || 'all',
    };
  }

  async dbHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }

  async redisHealth() {
    if (this.redis.status !== 'ready') {
      await this.redis.connect();
    }
    const pong = await this.redis.ping();
    return {
      status: pong === 'PONG' ? 'ok' : 'degraded',
      redisStatus: this.redis.status,
    };
  }

  async queueHealth() {
    const [ingestionCounts, predictionCounts, healthCounts, deadLetterCounts] = await Promise.all([
      this.ingestionQueue.getJobCounts('active', 'waiting', 'failed', 'completed', 'delayed'),
      this.predictionQueue.getJobCounts('active', 'waiting', 'failed', 'completed', 'delayed'),
      this.healthQueue.getJobCounts('active', 'waiting', 'failed', 'completed', 'delayed'),
      this.deadLetterQueue.getJobCounts('active', 'waiting', 'failed', 'completed', 'delayed'),
    ]);

    return {
      ingestion: ingestionCounts,
      prediction: predictionCounts,
      health: healthCounts,
      deadLetter: deadLetterCounts,
    };
  }

  async providerHealth() {
    return this.providersService.health();
  }

  async alerts(limit = 20) {
    return this.alertingService.recentSummary(limit);
  }

  async liveness() {
    return {
      live: true,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      memoryMb: {
        rss: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
        heapUsed: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
      },
    };
  }

  async readiness() {
    const [db, redis, queue, provider] = await Promise.all([
      this.tryCheck(() => this.dbHealth()),
      this.tryCheck(() => this.redisHealth()),
      this.tryCheck(() => this.queueHealth()),
      this.tryCheck(() => this.providerReadinessCheck()),
    ]);

    const checks = { db, redis, queue, provider };
    const ready = Object.values(checks).every((item) => item.status === 'ok');

    return {
      ready,
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async providerReadinessCheck(): Promise<HealthCheckResult> {
    const summary = await this.providersService.health(true);
    const adapters = Array.isArray(summary.adapters)
      ? (summary.adapters as Array<{ enabled?: boolean; healthy?: boolean; provider?: string }>)
      : [];
    const unhealthyEnabled = adapters.filter((item) => item.enabled && !item.healthy);

    if (unhealthyEnabled.length) {
      return {
        status: 'error',
        message: `Unhealthy providers: ${unhealthyEnabled.map((item) => item.provider || 'unknown').join(', ')}`,
        details: {
          unhealthyProviders: unhealthyEnabled,
        },
      };
    }

    return {
      status: 'ok',
      details: {
        providers: adapters,
      },
    };
  }

  private async tryCheck(fn: () => Promise<unknown>): Promise<HealthCheckResult> {
    try {
      const details = await fn();
      return { status: 'ok', details: details as Record<string, unknown> };
    } catch (error) {
      return { status: 'error', message: (error as Error).message };
    }
  }
}
