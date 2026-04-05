import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryMs = Math.max(20, Number(process.env.DB_SLOW_QUERY_MS || 250));

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    (this as any).$on('query', (event: any) => {
      const duration = Number(event.duration || 0);
      if (duration >= this.slowQueryMs) {
        const query = String(event.query || '').replace(/\s+/g, ' ').slice(0, 600);
        this.logger.warn(`slow_query durationMs=${duration} thresholdMs=${this.slowQueryMs} query="${query}"`);
      }
    });

    (this as any).$on('error', (event: any) => {
      this.logger.error(`prisma_error target=${event.target || 'unknown'} message=${event.message || 'unknown'}`);
    });

    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
