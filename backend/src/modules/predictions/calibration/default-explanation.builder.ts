import { Injectable } from '@nestjs/common';
import { ExplanationBuilder, PredictionEngineOutput } from '../engines/prediction.interfaces';

@Injectable()
export class DefaultExplanationBuilder implements ExplanationBuilder {
  build(features: Record<string, number>, output: PredictionEngineOutput): { summary: string; riskFlags: string[] } {
    const strongestFeature = Object.entries(features).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]?.[0] || 'model signal';
    const riskFlags: string[] = [];

    if (output.probabilities.homeWin < 0.45 && output.probabilities.awayWin < 0.45) {
      riskFlags.push('Dengeli olasilik dagilimi');
    }
    if ((features.fixtureDensityRisk || 0) > 0.5 || (features.backToBackRisk || 0) > 0.5) {
      riskFlags.push('Yuksek fikstur yogunlugu riski');
    }
    if (!riskFlags.length) {
      riskFlags.push('Dusuk veri guveni');
    }

    return {
      summary: `Tahmin modeli ${strongestFeature} sinyalini one cikardigi icin ev sahibi tarafini bir adim onde goruyor.`,
      riskFlags,
    };
  }
}
