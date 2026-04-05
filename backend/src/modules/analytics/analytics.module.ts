import { Module } from '@nestjs/common';
import { CalibrationModule } from 'src/modules/calibration/calibration.module';
import { FeatureLabModule } from 'src/modules/feature-lab/feature-lab.module';
import { ModelAnalysisModule } from 'src/modules/model-analysis/model-analysis.module';
import { ModelStrategyModule } from 'src/modules/model-strategy/model-strategy.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [CalibrationModule, ModelAnalysisModule, ModelStrategyModule, FeatureLabModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
