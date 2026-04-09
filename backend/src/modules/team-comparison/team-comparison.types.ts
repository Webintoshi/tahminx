import { PredictionEngineOutput } from '../predictions/engines/prediction.interfaces';

export type ComparisonWindow = 'last3' | 'last5' | 'last10';
export type AdvantageSide = 'home' | 'away' | 'balanced';

export interface TeamComparisonCategory {
  key: string;
  label: string;
  homeValue: number;
  awayValue: number;
  edge: number;
  advantage: AdvantageSide;
  summary: string;
}

export interface TeamComparisonStrengths {
  attack: number;
  defense: number;
  form: number;
  home: number;
  away: number;
  tempo: number;
  transition: number;
  setPiece: number;
  resilience: number;
  squad: number;
  overall: number;
}

export interface AggregatedTeamProfile {
  teamId: string;
  teamName: string;
  shortName: string | null;
  leagueId: string | null;
  seasonId: string | null;
  rank: number | null;
  requestedWindow: ComparisonWindow;
  appliedWindow: ComparisonWindow;
  sampleSize: number;
  matches: Array<{
    id: string;
    date: Date;
    venue: 'home' | 'away';
    opponentTeamId: string;
    opponentName: string;
    goalsFor: number;
    goalsAgainst: number;
    xgFor: number;
    xgAgainst: number;
    usedProxyXg: boolean;
    result: 'win' | 'draw' | 'loss';
  }>;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  xgForPerMatch: number;
  xgAgainstPerMatch: number;
  weightedForm: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  pointsPerMatch: number;
  shotsPerMatch: number;
  shotsOnTargetPerMatch: number;
  cornersPerMatch: number;
  possessionPerMatch: number;
  bigChancesPerMatch: number;
  cleanSheetRate: number;
  scoringRate: number;
  closeGamePointsRate: number;
  transitionActionsPerMatch: number;
  setPieceActionsPerMatch: number;
  homeWinRate: number;
  awayWinRate: number;
  homePointsPerMatch: number;
  awayPointsPerMatch: number;
  opponentRankStrength: number;
  restDaysAverage: number;
  dataQuality: number;
  dataCoverage: number;
  featureCoverage: number;
  mappingConfidence: number;
  actualXgCoverage: number;
  proxyXgUsageRate: number;
  missingDataNotes: string[];
  riskFlags: string[];
  featureSetFamilies: string[];
  pipelineSignals: Record<string, number>;
}

export interface ComparisonEngineResult {
  categories: TeamComparisonCategory[];
  overallEdge: number;
  favourite: AdvantageSide;
  fieldAdvantages: string[];
}

export interface ScenarioProbabilities {
  homeEdge: number;
  drawTendency: number;
  awayThreatLevel: number;
  overTendency: number;
  bttsTendency: number;
  topScorelines: Array<{ score: string; probability: number }>;
}

export interface ScenarioOutcome {
  name: string;
  probabilityScore: number;
  favoredSide: AdvantageSide;
  reasons: string[];
  supportingSignals: string[];
}

export interface ScenarioEngineResult {
  probabilities: ScenarioProbabilities;
  scenarios: ScenarioOutcome[];
  modelOutputs: Array<{
    model: 'elo' | 'poisson' | 'logistic';
    weight: number;
    output: PredictionEngineOutput;
  }>;
  rawConfidence: number;
  calibratedConfidence: number;
  modelDisagreement: number;
}
