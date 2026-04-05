import { Module } from '@nestjs/common';
import { ModelAnalysisService } from './model-analysis.service';

@Module({
  providers: [ModelAnalysisService],
  exports: [ModelAnalysisService],
})
export class ModelAnalysisModule {}
