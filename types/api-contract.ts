export type SportKey = "football" | "basketball" | string;

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  generatedAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: ApiError | null;
}

export interface Sport {
  id: string;
  key: SportKey;
  name: string;
  logoUrl?: string | null;
}

export interface LeagueListItem {
  id: string;
  sportId: string;
  sportKey: SportKey;
  name: string;
  country: string;
  season: string;
  logoUrl?: string | null;
  updatedAt?: string | null;
}

export interface LeagueDetail extends LeagueListItem {
  description?: string | null;
  statsSummary?: {
    avgScore: number | null;
    homeWinRate: number | null;
    awayWinRate: number | null;
    drawRate?: number | null;
  };
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor?: number | null;
  goalsAgainst?: number | null;
  form: Array<"W" | "D" | "L">;
}

export interface TeamListItem {
  id: string;
  leagueId: string;
  sportId: string;
  sportKey: SportKey;
  name: string;
  shortName?: string | null;
  city?: string | null;
  logoUrl?: string | null;
}

export interface TeamDetail extends TeamListItem {
  country?: string | null;
  foundedYear?: number | null;
  coach?: string | null;
  homeMetric?: number | null;
  awayMetric?: number | null;
  attackMetric?: number | null;
  defenseMetric?: number | null;
}

export interface TeamFormPoint {
  date: string;
  opponent: string;
  result: "W" | "D" | "L";
  scoreFor?: number | null;
  scoreAgainst?: number | null;
  value?: number | null;
}

export type MatchStatus = "scheduled" | "live" | "completed" | "postponed" | "cancelled";

export interface MatchListItem {
  id: string;
  sportKey: SportKey;
  leagueId: string;
  leagueName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  kickoffAt: string;
  status: MatchStatus;
  scoreHome?: number | null;
  scoreAway?: number | null;
  confidenceScore?: number | null;
}

export interface MatchDetail extends MatchListItem {
  venue?: string | null;
  round?: string | null;
  summary?: string | null;
  expectedScoreHome?: number | null;
  expectedScoreAway?: number | null;
  riskFlags?: string[] | null;
  h2hSummary?: string | null;
}

export interface MatchEvent {
  id: string;
  minute: number | null;
  teamId?: string | null;
  teamName?: string | null;
  type: string;
  title: string;
  description?: string | null;
}

export interface MatchStats {
  possessionHome?: number | null;
  possessionAway?: number | null;
  shotsHome?: number | null;
  shotsAway?: number | null;
  shotsOnTargetHome?: number | null;
  shotsOnTargetAway?: number | null;
  xgHome?: number | null;
  xgAway?: number | null;
  paceHome?: number | null;
  paceAway?: number | null;
  efficiencyHome?: number | null;
  efficiencyAway?: number | null;
}

export interface MatchPrediction {
  matchId: string;
  expectedScore: {
    home: number | null;
    away: number | null;
  };
  probabilities: {
    home: number;
    draw?: number | null;
    away: number;
  };
  confidenceScore?: number | null;
  riskFlags?: string[] | null;
  modelExplanation?: string | null;
  summary?: string | null;
  isLowConfidence?: boolean;
  isRecommended?: boolean;
}

export interface PredictionItem {
  id: string;
  matchId: string;
  sportKey: SportKey;
  leagueId: string;
  leagueName: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: string;
  confidenceScore?: number | null;
  riskLevel: "low" | "medium" | "high";
  expectedScore: {
    home: number | null;
    away: number | null;
  };
  probabilities: {
    home: number;
    draw?: number | null;
    away: number;
  };
  modelSummary: string;
  riskFlags?: string[] | null;
  isLowConfidence?: boolean;
  isRecommended?: boolean;
}

export interface RiskDistributionSummary {
  low: number;
  medium: number;
  high: number;
  updatedAt?: string | null;
}

export interface CalibrationHealthSummary {
  status?: string | null;
  brierScore?: number | null;
  ece?: number | null;
  reliability?: number | null;
  note?: string | null;
  updatedAt?: string | null;
}

export interface DashboardSummary {
  todayMatchCount: number;
  liveMatchCount: number;
  highConfidencePredictionCount: number;
  updatedLeagues: LeagueListItem[];
  highConfidencePredictions: PredictionItem[];
  recentPredictions: PredictionItem[];
  todayMatches: MatchListItem[];
  miniTrends: Array<{ label: string; values: number[] }>;
  calibratedHighConfidenceCount?: number | null;
  lowConfidenceCount?: number | null;
  avgConfidenceScore?: number | null;
  riskDistribution?: RiskDistributionSummary | null;
  calibrationHealthSummary?: CalibrationHealthSummary | null;
}

export interface GuideSummary {
  title: string;
  sections: Array<{ heading: string; text: string }>;
}

export interface TeamSquadPlayer {
  id: string;
  name: string;
  position: string;
  number?: number | null;
  status?: string | null;
}

export interface CalibrationResult {
  id: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  sampleSize?: number | null;
  brierScore?: number | null;
  ece?: number | null;
  reliability?: number | null;
  status?: string | null;
  note?: string | null;
  updatedAt?: string | null;
}

export interface CalibrationRunResponse {
  runId?: string | null;
  startedAt?: string | null;
  message?: string | null;
  status?: string | null;
  updatedAt?: string | null;
}

export interface PredictionRiskSummary {
  totalPredictions?: number | null;
  low?: number | null;
  medium?: number | null;
  high?: number | null;
  riskFlagsTop?: Array<{ flag: string; count: number }>;
  calibrationHealthSummary?: CalibrationHealthSummary | null;
  updatedAt?: string | null;
}

export interface ComparisonMetric {
  name: string;
  value?: number | null;
  delta?: number | null;
  rating?: string | null;
}

export interface ModelComparisonItem {
  modelVersion: string;
  sportKey: SportKey;
  leagueId?: string | null;
  leagueName?: string | null;
  accuracy?: number | null;
  logLoss?: number | null;
  brierScore?: number | null;
  avgConfidenceScore?: number | null;
  calibrationQuality?: number | null;
  sampleSize?: number | null;
  metrics?: ComparisonMetric[];
  updatedAt?: string | null;
}

export interface FeatureContribution {
  feature: string;
  score: number;
  direction?: "positive" | "negative" | "neutral" | string;
  description?: string | null;
}

export interface FeatureImportanceItem {
  modelVersion: string;
  sportKey: SportKey;
  updatedAt?: string | null;
  features: FeatureContribution[];
}

export interface FailedPredictionItem {
  id: string;
  matchId: string;
  matchLabel: string;
  sportKey: SportKey;
  leagueId: string;
  leagueName: string;
  modelVersion?: string | null;
  predictedResult: string;
  actualResult: string;
  confidenceScore?: number | null;
  riskFlags?: string[] | null;
  failureReasonSummary?: string | null;
  updatedAt?: string | null;
}

export interface FailedPredictionDetail extends FailedPredictionItem {
  summary?: string | null;
  probabilities?: {
    home: number;
    draw?: number | null;
    away: number;
  } | null;
  expectedScore?: {
    home: number | null;
    away: number | null;
  } | null;
  heuristicAnalysis?: {
    missingDataImpact?: string | null;
    staleStatsImpact?: string | null;
    modelDisagreementImpact?: string | null;
    upsetScenario?: string | null;
    weakMappingConfidence?: string | null;
    injuryUncertainty?: string | null;
  } | null;
}

export interface ModelPerformancePoint {
  timestamp: string;
  sportKey?: SportKey | null;
  leagueId?: string | null;
  leagueName?: string | null;
  modelVersion?: string | null;
  accuracy?: number | null;
  logLoss?: number | null;
  brierScore?: number | null;
  avgConfidenceScore?: number | null;
  sampleSize?: number | null;
}

export interface DriftSummary {
  metric: string;
  recent7d?: number | null;
  previous30d?: number | null;
  delta?: number | null;
  status?: string | null;
}

export interface PerformanceDriftSummary {
  performanceDropDetected?: boolean | null;
  confidenceDriftDetected?: boolean | null;
  calibrationDriftDetected?: boolean | null;
  summaries?: DriftSummary[];
  updatedAt?: string | null;
}

export interface StrategySummary {
  totalStrategies?: number | null;
  activeStrategies?: number | null;
  autoSelectedAt?: string | null;
  note?: string | null;
  updatedAt?: string | null;
}

export interface ModelStrategy {
  id: string;
  sportKey: SportKey;
  leagueId?: string | null;
  leagueName?: string | null;
  predictionType: string;
  primaryModel: string;
  fallbackModel?: string | null;
  isActive: boolean;
  summary?: StrategySummary | null;
  updatedAt?: string | null;
}

export interface EnsembleWeight {
  model: string;
  weight: number;
}

export interface EnsembleConfig {
  id: string;
  sportKey: SportKey;
  leagueId?: string | null;
  leagueName?: string | null;
  modelVersion?: string | null;
  weights: EnsembleWeight[];
  isActive?: boolean | null;
  normalizedWeightTotal?: number | null;
  updatedAt?: string | null;
}

export interface FeatureEntry {
  key: string;
  label: string;
  enabled: boolean;
}

export interface FeatureGroup {
  id: string;
  sportKey: SportKey;
  name: string;
  description?: string | null;
  isEnabled: boolean;
  features: FeatureEntry[];
  updatedAt?: string | null;
}

export interface FeatureSet {
  id: string;
  sportKey: SportKey;
  name: string;
  template?: string | null;
  featureKeys: string[];
  isActive: boolean;
  updatedAt?: string | null;
}

export interface FeatureLabTemplate {
  id: string;
  sportKey: SportKey;
  label: string;
  description?: string | null;
}

export interface FeatureLab {
  featureGroups: FeatureGroup[];
  featureSets: FeatureSet[];
  templates: FeatureLabTemplate[];
  activeFeatureSetId?: string | null;
  updatedAt?: string | null;
}

export interface FeatureExperiment {
  id: string;
  modelVersion: string;
  featureSetId: string;
  leagueId: string;
  sportKey?: SportKey | null;
  from: string;
  to: string;
  status: "queued" | "running" | "completed" | "failed" | string;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface FeatureExperimentResult {
  id: string;
  experimentId: string;
  modelVersion: string;
  featureSetId: string;
  featureSetName?: string | null;
  leagueId: string;
  leagueName?: string | null;
  accuracy?: number | null;
  logLoss?: number | null;
  brierScore?: number | null;
  sampleSize?: number | null;
  isWinner?: boolean;
  updatedAt?: string | null;
}
