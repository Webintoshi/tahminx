import { Module } from '@nestjs/common';
import { JobsModule } from 'src/modules/jobs/jobs.module';
import { ModelAnalysisModule } from 'src/modules/model-analysis/model-analysis.module';
import { ProvidersModule } from 'src/modules/providers/providers.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [JobsModule, ProvidersModule, ModelAnalysisModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
