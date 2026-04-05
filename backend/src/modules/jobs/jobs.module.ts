import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { LiveModule } from 'src/modules/live/live.module';
import { ProvidersModule } from 'src/modules/providers/providers.module';
import { PredictionsModule } from 'src/modules/predictions/predictions.module';
import { resolveAppRole, isWorkerRole } from 'src/config/runtime-role';
import { QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { IngestionProcessor } from './processors/ingestion.processor';
import { PredictionProcessor } from './processors/prediction.processor';
import { HealthProcessor } from './processors/health.processor';
import { JobsService } from './jobs.service';
import { CanonicalMappingService } from './services/canonical-mapping.service';

const runtimeRole = resolveAppRole(process.env.APP_ROLE);
const workerEnabled = isWorkerRole(runtimeRole);

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection:
          configService.get('redis.connection') ?? {
            host: '127.0.0.1',
            port: 6379,
          },
        defaultJobOptions: {
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 200,
          removeOnFail: 500,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.INGESTION },
      { name: QUEUE_NAMES.PREDICTION },
      { name: QUEUE_NAMES.HEALTH },
      { name: QUEUE_NAMES.DEAD_LETTER },
    ),
    ProvidersModule,
    PredictionsModule,
    LiveModule,
  ],
  providers: [
    JobsService,
    CanonicalMappingService,
    ...(workerEnabled ? [IngestionProcessor, PredictionProcessor, HealthProcessor] : []),
  ],
  exports: [JobsService, BullModule, CanonicalMappingService],
})
export class JobsModule {}
