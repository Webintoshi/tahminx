import { Injectable, Logger, MessageEvent, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { filter, interval, map, merge, Observable, of, Subject } from 'rxjs';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { CACHE_TTL_SECONDS } from 'src/shared/constants/cache.constants';

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
    configService: ConfigService,
  ) {
    const redisUrl = configService.get<string>('redis.url');
    if (redisUrl) {
      this.publisher = new Redis(redisUrl);
      this.subscriber = new Redis(redisUrl);
    } else {
      const redisConfig = {
        host: configService.get<string>('redis.host') || process.env.REDIS_HOST || '127.0.0.1',
        port: Number(configService.get<number>('redis.port') || process.env.REDIS_PORT || 6379),
        password: configService.get<string>('redis.password') || process.env.REDIS_PASSWORD || undefined,
        ...(Boolean(configService.get<boolean>('redis.tlsEnabled')) ? { tls: { rejectUnauthorized: false } } : {}),
      };
      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);
    }
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
    return this.cacheService.getOrSet(CacheKeys.liveMatches(), CACHE_TTL_SECONDS.liveMatches, async () =>
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
    await this.cacheService.del([CacheKeys.matchDetail(normalized.matchId), CacheKeys.liveMatches()]);
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
