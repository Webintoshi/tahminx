import { Injectable } from '@nestjs/common';
import { PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class FootballLogisticEngine {
  run(features: Record<string, number>): PredictionEngineOutput {
    const form = Number(features.recentFormScore || 0);
    const homeAway = Number(features.homeAwayStrength || 0);
    const oppDiff = Number(features.opponentStrengthDiff || 0);
    const missing = Number(features.missingPlayersCount || 0);
    const tableRank = Number(features.tableRank || 10);
    const avgGoalsFor = Number(features.avgGoalsFor || 1.4);
    const avgGoalsAgainst = Number(features.avgGoalsAgainst || 1.2);

    const signal =
      form * 0.72 +
      homeAway * 0.58 +
      oppDiff * 0.41 +
      (10 - tableRank) * 0.03 -
      missing * 0.11;
    const homeWin = clamp01(1 / (1 + Math.exp(-signal)));
    const draw = clamp01(0.21 + (1 - Math.abs(homeWin - 0.5) * 2) * 0.09);
    const awayWin = clamp01(1 - homeWin - draw);

    return {
      probabilities: normalizeProbabilities({ homeWin, draw, awayWin }),
      expectedScore: {
        home: Number((Math.max(0.4, avgGoalsFor + form * 0.4 - missing * 0.08)).toFixed(2)),
        away: Number((Math.max(0.3, avgGoalsAgainst * 0.9 + (1 - homeAway) * 0.45)).toFixed(2)),
      },
    };
  }
}

const normalizeProbabilities = (values: { homeWin: number; draw: number; awayWin: number }) => {
  const homeWin = clamp01(Number(values.homeWin ?? 0));
  const draw = clamp01(Number(values.draw ?? 0));
  const awayWin = clamp01(Number(values.awayWin ?? 0));
  const total = homeWin + draw + awayWin;

  if (!total) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: Number((homeWin / total).toFixed(4)),
    draw: Number((draw / total).toFixed(4)),
    awayWin: Number((awayWin / total).toFixed(4)),
  };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
