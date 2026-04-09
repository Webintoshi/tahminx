import { Module } from '@nestjs/common';
import { CalibrationModule } from 'src/modules/calibration/calibration.module';
import { ModelStrategyModule } from 'src/modules/model-strategy/model-strategy.module';
import { PredictionsModule } from 'src/modules/predictions/predictions.module';
import { ComparisonEngineService } from './services/comparison-engine.service';
import { ComparisonConfidenceService } from './services/comparison-confidence.service';
import { ExplanationEngineService } from './services/explanation-engine.service';
import { ProxyXGService } from './services/proxy-xg.service';
import { ScenarioEngineService } from './services/scenario-engine.service';
import { TeamFeatureAggregationService } from './services/team-feature-aggregation.service';
import { TeamStrengthService } from './services/team-strength.service';
import { TeamComparisonController } from './team-comparison.controller';
import { TeamComparisonService } from './team-comparison.service';

@Module({
  imports: [CalibrationModule, ModelStrategyModule, PredictionsModule],
  controllers: [TeamComparisonController],
  providers: [
    TeamComparisonService,
    TeamFeatureAggregationService,
    ProxyXGService,
    TeamStrengthService,
    ComparisonEngineService,
    ScenarioEngineService,
    ExplanationEngineService,
    ComparisonConfidenceService,
  ],
})
export class TeamComparisonModule {}
