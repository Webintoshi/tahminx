import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly keyPrefix: string;

  constructor(
    configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    this.keyPrefix = String(configService.get<string>('cache.prefix') || 'tahminx');
    const redisUrl = configService.get<string>('redis.url');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: false,
        maxRetriesPerRequest: null,
      });
    } else {
      this.redis = new Redis({
        host: configService.get<string>('redis.host') || process.env.REDIS_HOST || '127.0.0.1',
        port: Number(configService.get<number>('redis.port') || process.env.REDIS_PORT || 6379),
        password: configService.get<string>('redis.password') || process.env.REDIS_PASSWORD || undefined,
        ...(Boolean(configService.get<boolean>('redis.tlsEnabled')) ? { tls: { rejectUnauthorized: false } } : {}),
        lazyConnect: false,
        maxRetriesPerRequest: null,
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === 'ready' || this.redis.status === 'connecting') {
      await this.redis.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startedAt = Date.now();
    try {
      const namespacedKey = this.withPrefix(key);
      const cached = await this.redis.get(namespacedKey);
      if (!cached) {
        this.metricsService.observeCache(this.domainFromKey(key), 'get', 'miss');
        this.logger.debug(`cache_miss key=${namespacedKey}`);
        return null;
      }
      this.metricsService.observeCache(this.domainFromKey(key), 'get', 'hit');
      this.logger.debug(`cache_hit key=${namespacedKey} latencyMs=${Date.now() - startedAt}`);
      return JSON.parse(cached) as T;
    } catch (error) {
      this.metricsService.observeCache(this.domainFromKey(key), 'get', 'error');
      this.logger.warn(`cache_get_failed key=${key} reason=${(error as Error).message}`);
      return null;
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, resolver: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await resolver();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const namespacedKey = this.withPrefix(key);
      await this.redis.set(namespacedKey, JSON.stringify(value), 'EX', ttlSeconds);
      this.metricsService.observeCache(this.domainFromKey(key), 'set', 'ok');
    } catch (error) {
      this.metricsService.observeCache(this.domainFromKey(key), 'set', 'error');
      this.logger.warn(`cache_set_failed key=${key} reason=${(error as Error).message}`);
    }
  }

  async del(keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await this.redis.del(...keys.map((key) => this.withPrefix(key)));
      keys.forEach((key) => this.metricsService.observeCache(this.domainFromKey(key), 'del', 'ok'));
    } catch (error) {
      keys.forEach((key) => this.metricsService.observeCache(this.domainFromKey(key), 'del', 'error'));
      this.logger.warn(`cache_del_failed count=${keys.length} reason=${(error as Error).message}`);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      let cursor = '0';
      const pattern = `${this.withPrefix(prefix)}*`;
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (keys.length) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
      this.metricsService.observeCache(this.domainFromKey(prefix), 'scan', 'ok');
    } catch (error) {
      this.metricsService.observeCache(this.domainFromKey(prefix), 'scan', 'error');
      this.logger.warn(`cache_del_by_prefix_failed prefix=${prefix} reason=${(error as Error).message}`);
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const namespaced = this.withPrefix(key);
    try {
      const next = await this.redis.incr(namespaced);
      if (ttlSeconds && next === 1) {
        await this.redis.expire(namespaced, ttlSeconds);
      }
      this.metricsService.observeCache(this.domainFromKey(key), 'incr', 'ok');
      return next;
    } catch (error) {
      this.metricsService.observeCache(this.domainFromKey(key), 'incr', 'error');
      this.logger.warn(`cache_incr_failed key=${key} reason=${(error as Error).message}`);
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return this.redis.ttl(this.withPrefix(key));
    } catch {
      return -2;
    }
  }

  private withPrefix(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private domainFromKey(key: string): string {
    const trimmed = key.includes(':') ? key.split(':')[0] : key;
    return trimmed || 'default';
  }
}
