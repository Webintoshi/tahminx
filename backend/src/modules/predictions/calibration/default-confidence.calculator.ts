import { Injectable } from '@nestjs/common';
import { ConfidenceCalculator, PredictionEngineOutput } from '../engines/prediction.interfaces';

@Injectable()
export class DefaultConfidenceCalculator implements ConfidenceCalculator {
  score(features: Record<string, number>, output: PredictionEngineOutput): number {
    const probabilitySpread = Math.abs(output.probabilities.homeWin - output.probabilities.awayWin);
    const featureMagnitude = Object.values(features).reduce((sum, value) => sum + Math.abs(value), 0);
    const normalized = Math.min(1, (probabilitySpread * 2 + featureMagnitude / 200) / 2);
    return Math.round(normalized * 100);
  }
}
