import { Module } from '@nestjs/common';
import { CalibrationModule } from 'src/modules/calibration/calibration.module';
import { FeatureLabModule } from 'src/modules/feature-lab/feature-lab.module';
import { ModelStrategyModule } from 'src/modules/model-strategy/model-strategy.module';
import { PredictionsController } from './predictions.controller';
import { PredictionsRepository } from './predictions.repository';
import { PredictionsService } from './predictions.service';
import { FootballEloEngine } from './engines/football-elo.engine';
import { FootballPoissonEngine } from './engines/football-poisson.engine';
import { BasketballTeamRatingEngine } from './engines/basketball-team-rating.engine';
import { BasketballPaceTotalEngine } from './engines/basketball-pace-total.engine';
import { FootballFeatureBuilder } from './features/football-feature.builder';
import { BasketballFeatureBuilder } from './features/basketball-feature.builder';
import { DefaultConfidenceCalculator } from './calibration/default-confidence.calculator';
import { DefaultExplanationBuilder } from './calibration/default-explanation.builder';
import { PredictionConfidenceService } from './calibration/prediction-confidence.service';
import { PredictionRiskFlagEngine } from './risk/prediction-risk-flag.engine';

@Module({
  imports: [CalibrationModule, ModelStrategyModule, FeatureLabModule],
  controllers: [PredictionsController],
  providers: [
    PredictionsService,
    PredictionsRepository,
    FootballEloEngine,
    FootballPoissonEngine,
    BasketballTeamRatingEngine,
    BasketballPaceTotalEngine,
    FootballFeatureBuilder,
    BasketballFeatureBuilder,
    DefaultConfidenceCalculator,
    PredictionConfidenceService,
    PredictionRiskFlagEngine,
    DefaultExplanationBuilder,
  ],
  exports: [PredictionsService],
})
export class PredictionsModule {}
