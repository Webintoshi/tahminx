import { z } from "zod";

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

export const paginationMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
  generatedAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: paginationMetaSchema.optional(),
    error: apiErrorSchema.nullable().optional()
  });

export const sportSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable().optional()
});

export const leagueListItemSchema = z.object({
  id: z.string(),
  sportId: z.string(),
  sportKey: z.string(),
  name: z.string(),
  country: z.string(),
  season: z.string(),
  logoUrl: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const leagueDetailSchema = leagueListItemSchema.extend({
  description: z.string().nullable().optional(),
  statsSummary: z
    .object({
      avgScore: z.number().nullable(),
      homeWinRate: z.number().nullable(),
      awayWinRate: z.number().nullable(),
      drawRate: z.number().nullable().optional()
    })
    .optional()
});

export const standingRowSchema = z.object({
  position: z.number(),
  teamId: z.string(),
  teamName: z.string(),
  played: z.number(),
  won: z.number(),
  drawn: z.number(),
  lost: z.number(),
  points: z.number(),
  goalsFor: z.number().nullable().optional(),
  goalsAgainst: z.number().nullable().optional(),
  form: z.array(z.enum(["W", "D", "L"]))
});

export const teamListItemSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  sportId: z.string(),
  sportKey: z.string(),
  name: z.string(),
  shortName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional()
});

export const teamDetailSchema = teamListItemSchema.extend({
  country: z.string().nullable().optional(),
  foundedYear: z.number().nullable().optional(),
  coach: z.string().nullable().optional(),
  homeMetric: z.number().nullable().optional(),
  awayMetric: z.number().nullable().optional(),
  attackMetric: z.number().nullable().optional(),
  defenseMetric: z.number().nullable().optional()
});

export const teamFormPointSchema = z.object({
  date: z.string(),
  opponent: z.string(),
  result: z.enum(["W", "D", "L"]),
  scoreFor: z.number().nullable().optional(),
  scoreAgainst: z.number().nullable().optional(),
  value: z.number().nullable().optional()
});

export const matchListItemSchema = z.object({
  id: z.string(),
  sportKey: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  homeLogoUrl: z.string().nullable().optional(),
  awayLogoUrl: z.string().nullable().optional(),
  kickoffAt: z.string(),
  status: z.enum(["scheduled", "live", "completed", "postponed", "cancelled"]),
  scoreHome: z.number().nullable().optional(),
  scoreAway: z.number().nullable().optional(),
  confidenceScore: z.number().nullable().optional()
});

export const matchDetailSchema = matchListItemSchema.extend({
  venue: z.string().nullable().optional(),
  round: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  expectedScoreHome: z.number().nullable().optional(),
  expectedScoreAway: z.number().nullable().optional(),
  riskFlags: z.array(z.string()).nullable().optional(),
  h2hSummary: z.string().nullable().optional()
});

export const matchEventSchema = z.object({
  id: z.string(),
  minute: z.number().nullable(),
  teamId: z.string().nullable().optional(),
  teamName: z.string().nullable().optional(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable().optional()
});

export const matchStatsSchema = z.object({
  possessionHome: z.number().nullable().optional(),
  possessionAway: z.number().nullable().optional(),
  shotsHome: z.number().nullable().optional(),
  shotsAway: z.number().nullable().optional(),
  shotsOnTargetHome: z.number().nullable().optional(),
  shotsOnTargetAway: z.number().nullable().optional(),
  xgHome: z.number().nullable().optional(),
  xgAway: z.number().nullable().optional(),
  paceHome: z.number().nullable().optional(),
  paceAway: z.number().nullable().optional(),
  efficiencyHome: z.number().nullable().optional(),
  efficiencyAway: z.number().nullable().optional()
});

export const matchPredictionSchema = z.object({
  matchId: z.string(),
  expectedScore: z.object({
    home: z.number().nullable(),
    away: z.number().nullable()
  }),
  probabilities: z.object({
    home: z.number(),
    draw: z.number().nullable().optional(),
    away: z.number()
  }),
  confidenceScore: z.number().nullable().optional(),
  riskFlags: z.array(z.string()).nullable().optional(),
  modelExplanation: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  isLowConfidence: z.boolean().optional(),
  isRecommended: z.boolean().optional()
});

export const predictionItemSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  sportKey: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  kickoffAt: z.string(),
  confidenceScore: z.number().nullable().optional(),
  riskLevel: z.enum(["low", "medium", "high"]),
  expectedScore: z.object({
    home: z.number().nullable(),
    away: z.number().nullable()
  }),
  probabilities: z.object({
    home: z.number(),
    draw: z.number().nullable().optional(),
    away: z.number()
  }),
  modelSummary: z.string(),
  riskFlags: z.array(z.string()).nullable().optional(),
  isLowConfidence: z.boolean().optional(),
  isRecommended: z.boolean().optional()
});

export const calibrationHealthSummarySchema = z.object({
  status: z.string().nullable().optional(),
  brierScore: z.number().nullable().optional(),
  ece: z.number().nullable().optional(),
  reliability: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const riskDistributionSummarySchema = z.object({
  low: z.number(),
  medium: z.number(),
  high: z.number(),
  updatedAt: z.string().nullable().optional()
});

export const dashboardSummarySchema = z.object({
  todayMatchCount: z.number(),
  liveMatchCount: z.number(),
  highConfidencePredictionCount: z.number(),
  updatedLeagues: z.array(leagueListItemSchema),
  highConfidencePredictions: z.array(predictionItemSchema),
  recentPredictions: z.array(predictionItemSchema),
  todayMatches: z.array(matchListItemSchema),
  miniTrends: z.array(
    z.object({
      label: z.string(),
      values: z.array(z.number())
    })
  ),
  calibratedHighConfidenceCount: z.number().nullable().optional(),
  lowConfidenceCount: z.number().nullable().optional(),
  avgConfidenceScore: z.number().nullable().optional(),
  riskDistribution: riskDistributionSummarySchema.nullable().optional(),
  calibrationHealthSummary: calibrationHealthSummarySchema.nullable().optional()
});

export const guideSummarySchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      text: z.string()
    })
  )
});

export const teamSquadPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string(),
  number: z.number().nullable().optional(),
  status: z.string().nullable().optional()
});

export const calibrationResultSchema = z.object({
  id: z.string(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  sampleSize: z.number().nullable().optional(),
  brierScore: z.number().nullable().optional(),
  ece: z.number().nullable().optional(),
  reliability: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const calibrationRunResponseSchema = z.object({
  runId: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const predictionRiskSummarySchema = z.object({
  totalPredictions: z.number().nullable().optional(),
  low: z.number().nullable().optional(),
  medium: z.number().nullable().optional(),
  high: z.number().nullable().optional(),
  riskFlagsTop: z.array(z.object({ flag: z.string(), count: z.number() })).optional(),
  calibrationHealthSummary: calibrationHealthSummarySchema.nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const comparisonMetricSchema = z.object({
  name: z.string(),
  value: z.number().nullable().optional(),
  delta: z.number().nullable().optional(),
  rating: z.string().nullable().optional()
});

export const modelComparisonItemSchema = z.object({
  modelVersion: z.string(),
  sportKey: z.string(),
  leagueId: z.string().nullable().optional(),
  leagueName: z.string().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  logLoss: z.number().nullable().optional(),
  brierScore: z.number().nullable().optional(),
  avgConfidenceScore: z.number().nullable().optional(),
  calibrationQuality: z.number().nullable().optional(),
  sampleSize: z.number().nullable().optional(),
  metrics: z.array(comparisonMetricSchema).optional(),
  updatedAt: z.string().nullable().optional()
});

export const featureContributionSchema = z.object({
  feature: z.string(),
  score: z.number(),
  direction: z.string().optional(),
  description: z.string().nullable().optional()
});

export const featureImportanceItemSchema = z.object({
  modelVersion: z.string(),
  sportKey: z.string(),
  updatedAt: z.string().nullable().optional(),
  features: z.array(featureContributionSchema)
});

export const failedPredictionItemSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  matchLabel: z.string(),
  sportKey: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  modelVersion: z.string().nullable().optional(),
  predictedResult: z.string(),
  actualResult: z.string(),
  confidenceScore: z.number().nullable().optional(),
  riskFlags: z.array(z.string()).nullable().optional(),
  failureReasonSummary: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const failedPredictionDetailSchema = failedPredictionItemSchema.extend({
  summary: z.string().nullable().optional(),
  probabilities: z
    .object({
      home: z.number(),
      draw: z.number().nullable().optional(),
      away: z.number()
    })
    .nullable()
    .optional(),
  expectedScore: z
    .object({
      home: z.number().nullable(),
      away: z.number().nullable()
    })
    .nullable()
    .optional(),
  heuristicAnalysis: z
    .object({
      missingDataImpact: z.string().nullable().optional(),
      staleStatsImpact: z.string().nullable().optional(),
      modelDisagreementImpact: z.string().nullable().optional(),
      upsetScenario: z.string().nullable().optional(),
      weakMappingConfidence: z.string().nullable().optional(),
      injuryUncertainty: z.string().nullable().optional()
    })
    .nullable()
    .optional()
});

export const modelPerformancePointSchema = z.object({
  timestamp: z.string(),
  sportKey: z.string().nullable().optional(),
  leagueId: z.string().nullable().optional(),
  leagueName: z.string().nullable().optional(),
  modelVersion: z.string().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  logLoss: z.number().nullable().optional(),
  brierScore: z.number().nullable().optional(),
  avgConfidenceScore: z.number().nullable().optional(),
  sampleSize: z.number().nullable().optional()
});

export const driftSummarySchema = z.object({
  metric: z.string(),
  recent7d: z.number().nullable().optional(),
  previous30d: z.number().nullable().optional(),
  delta: z.number().nullable().optional(),
  status: z.string().nullable().optional()
});

export const performanceDriftSummarySchema = z.object({
  performanceDropDetected: z.boolean().nullable().optional(),
  confidenceDriftDetected: z.boolean().nullable().optional(),
  calibrationDriftDetected: z.boolean().nullable().optional(),
  summaries: z.array(driftSummarySchema).optional(),
  updatedAt: z.string().nullable().optional()
});

export const strategySummarySchema = z.object({
  totalStrategies: z.number().nullable().optional(),
  activeStrategies: z.number().nullable().optional(),
  autoSelectedAt: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const modelStrategySchema = z.object({
  id: z.string(),
  sportKey: z.string(),
  leagueId: z.string().nullable().optional(),
  leagueName: z.string().nullable().optional(),
  predictionType: z.string(),
  primaryModel: z.string(),
  fallbackModel: z.string().nullable().optional(),
  isActive: z.boolean(),
  summary: strategySummarySchema.nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const ensembleWeightSchema = z.object({
  model: z.string(),
  weight: z.number()
});

export const ensembleConfigSchema = z.object({
  id: z.string(),
  sportKey: z.string(),
  leagueId: z.string().nullable().optional(),
  leagueName: z.string().nullable().optional(),
  modelVersion: z.string().nullable().optional(),
  weights: z.array(ensembleWeightSchema),
  isActive: z.boolean().nullable().optional(),
  normalizedWeightTotal: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const featureEntrySchema = z.object({
  key: z.string(),
  label: z.string(),
  enabled: z.boolean()
});

export const featureGroupSchema = z.object({
  id: z.string(),
  sportKey: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isEnabled: z.boolean(),
  features: z.array(featureEntrySchema),
  updatedAt: z.string().nullable().optional()
});

export const featureSetSchema = z.object({
  id: z.string(),
  sportKey: z.string(),
  name: z.string(),
  template: z.string().nullable().optional(),
  featureKeys: z.array(z.string()),
  isActive: z.boolean(),
  updatedAt: z.string().nullable().optional()
});

export const featureLabTemplateSchema = z.object({
  id: z.string(),
  sportKey: z.string(),
  label: z.string(),
  description: z.string().nullable().optional()
});

export const featureLabSchema = z.object({
  featureGroups: z.array(featureGroupSchema),
  featureSets: z.array(featureSetSchema),
  templates: z.array(featureLabTemplateSchema),
  activeFeatureSetId: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const featureExperimentSchema = z.object({
  id: z.string(),
  modelVersion: z.string(),
  featureSetId: z.string(),
  leagueId: z.string(),
  sportKey: z.string().nullable().optional(),
  from: z.string(),
  to: z.string(),
  status: z.string(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const featureExperimentResultSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  modelVersion: z.string(),
  featureSetId: z.string(),
  featureSetName: z.string().nullable().optional(),
  leagueId: z.string(),
  leagueName: z.string().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  logLoss: z.number().nullable().optional(),
  brierScore: z.number().nullable().optional(),
  sampleSize: z.number().nullable().optional(),
  isWinner: z.boolean().optional(),
  updatedAt: z.string().nullable().optional()
});
