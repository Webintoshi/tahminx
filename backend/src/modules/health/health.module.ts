import { Module } from '@nestjs/common';
import { JobsModule } from 'src/modules/jobs/jobs.module';
import { ProvidersModule } from 'src/modules/providers/providers.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [JobsModule, ProvidersModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
