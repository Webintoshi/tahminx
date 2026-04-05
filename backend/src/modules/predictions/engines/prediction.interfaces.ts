export interface PredictionEngineInput {
  matchId: string;
  sportCode: 'FOOTBALL' | 'BASKETBALL';
  homeTeamId: string;
  awayTeamId: string;
  context?: Record<string, unknown>;
}

export interface PredictionEngineOutput {
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  expectedScore: {
    home: number;
    away: number;
  };
}

export interface PredictionEngine {
  key: string;
  run(input: PredictionEngineInput): Promise<PredictionEngineOutput>;
}

export interface FeatureBuilder {
  build(input: PredictionEngineInput): Promise<Record<string, number>>;
}

export interface ConfidenceCalculator {
  score(features: Record<string, number>, output: PredictionEngineOutput): number;
}

export interface ExplanationBuilder {
  build(features: Record<string, number>, output: PredictionEngineOutput): { summary: string; riskFlags: string[] };
}
