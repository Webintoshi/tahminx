import { Module } from '@nestjs/common';
import { FeatureLabModule } from 'src/modules/feature-lab/feature-lab.module';
import { ModelAnalysisModule } from 'src/modules/model-analysis/model-analysis.module';
import { ModelStrategyModule } from 'src/modules/model-strategy/model-strategy.module';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';

@Module({
  imports: [ModelAnalysisModule, ModelStrategyModule, FeatureLabModule],
  controllers: [ModelsController],
  providers: [ModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}
