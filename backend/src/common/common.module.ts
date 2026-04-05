import { Global, Module } from '@nestjs/common';
import { AlertingService } from './alerts/alerting.service';
import { MetricsService } from './metrics/metrics.service';
import { StorageModule } from './storage/storage.module';
import { CacheService } from './utils/cache.service';

@Global()
@Module({
  imports: [StorageModule],
  providers: [MetricsService, CacheService, AlertingService],
  exports: [MetricsService, CacheService, AlertingService, StorageModule],
})
export class CommonModule {}
