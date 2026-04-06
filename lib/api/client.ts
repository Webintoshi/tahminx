import { z } from "zod";
import {
  calibrationResultSchema,
  calibrationRunResponseSchema,
  dashboardSummarySchema,
  ensembleConfigSchema,
  featureExperimentResultSchema,
  featureExperimentSchema,
  featureLabSchema,
  failedPredictionDetailSchema,
  failedPredictionItemSchema,
  featureImportanceItemSchema,
  guideSummarySchema,
  leagueDetailSchema,
  leagueListItemSchema,
  matchDetailSchema,
  matchEventSchema,
  matchListItemSchema,
  matchPredictionSchema,
  matchStatsSchema,
  modelComparisonItemSchema,
  modelPerformancePointSchema,
  modelStrategySchema,
  performanceDriftSummarySchema,
  predictionItemSchema,
  predictionRiskSummarySchema,
  strategySummarySchema,
  sportSchema,
  standingRowSchema,
  teamDetailSchema,
  teamFormListSchema,
  teamListItemSchema,
  teamSquadPlayerSchema
} from "@/lib/api/contract-schemas";
import { publicRequest } from "@/lib/api/http-client";
import {
  toQueryString,
  type AdminAnalyticsQuery,
  type FeatureExperimentResultsQuery,
  type FailedPredictionQuery,
  type MatchQuery,
  type PredictionQuery,
  type StrategyQuery
} from "@/lib/api/query";

const listQueryToPath = (
  path: string,
  query?:
    | MatchQuery
    | PredictionQuery
    | AdminAnalyticsQuery
    | FeatureExperimentResultsQuery
    | FailedPredictionQuery
    | StrategyQuery
    | Record<string, string | number | boolean | null | undefined>
) => `${path}${toQueryString(query as Record<string, string | number | boolean | null | undefined> | undefined)}`;

export const apiClient = {
  getSports: () => publicRequest("/sports", z.array(sportSchema)),

  getLeagues: (query?: MatchQuery) => publicRequest(listQueryToPath("/leagues", query), z.array(leagueListItemSchema)),
  getLeagueDetail: (leagueId: string) => publicRequest(`/leagues/${leagueId}`, leagueDetailSchema),
  getLeagueStandings: (leagueId: string) => publicRequest(`/leagues/${leagueId}/standings`, z.array(standingRowSchema)),

  getTeams: (query?: MatchQuery) => publicRequest(listQueryToPath("/teams", query), z.array(teamListItemSchema)),
  getTeamDetail: (teamId: string) => publicRequest(`/teams/${teamId}`, teamDetailSchema),
  getTeamMatches: (teamId: string, query?: MatchQuery) =>
    publicRequest(listQueryToPath(`/teams/${teamId}/matches`, query), z.array(matchListItemSchema)),
  getTeamForm: (teamId: string) => publicRequest(`/teams/${teamId}/form`, teamFormListSchema),
  getTeamSquad: (teamId: string) => publicRequest(`/teams/${teamId}/squad`, z.array(teamSquadPlayerSchema)),

  getMatches: (query?: MatchQuery) => publicRequest(listQueryToPath("/matches", query), z.array(matchListItemSchema)),
  getTodayMatches: (query?: MatchQuery) =>
    publicRequest(listQueryToPath("/matches/today", query), z.array(matchListItemSchema)),
  getTomorrowMatches: (query?: MatchQuery) =>
    publicRequest(listQueryToPath("/matches/tomorrow", query), z.array(matchListItemSchema)),
  getLiveMatches: (query?: MatchQuery) =>
    publicRequest(listQueryToPath("/matches/live", query), z.array(matchListItemSchema)),
  getCompletedMatches: (query?: MatchQuery) =>
    publicRequest(listQueryToPath("/matches/completed", query), z.array(matchListItemSchema)),
  getMatchDetail: (matchId: string) => publicRequest(`/matches/${matchId}`, matchDetailSchema),
  getMatchEvents: (matchId: string) => publicRequest(`/matches/${matchId}/events`, z.array(matchEventSchema)),
  getMatchStats: (matchId: string) => publicRequest(`/matches/${matchId}/stats`, matchStatsSchema),
  getMatchPrediction: (matchId: string) => publicRequest(`/matches/${matchId}/prediction`, matchPredictionSchema),

  getPredictions: (query?: PredictionQuery) =>
    publicRequest(listQueryToPath("/predictions", query), z.array(predictionItemSchema)),
  getHighConfidencePredictions: () =>
    publicRequest("/predictions/high-confidence", z.array(predictionItemSchema)),

  getDashboardAnalytics: () => publicRequest("/analytics/dashboard", dashboardSummarySchema),
  getGuideSummary: () => publicRequest("/guide/summary", guideSummarySchema),

  getCalibrationResults: () =>
    publicRequest("/admin/calibration/results", z.array(calibrationResultSchema)),
  runCalibration: () =>
    publicRequest("/admin/calibration/run", calibrationRunResponseSchema, { method: "POST" }),
  getPredictionRiskSummary: () =>
    publicRequest("/admin/predictions/risk-summary", predictionRiskSummarySchema),
  getLowConfidencePredictions: (query?: PredictionQuery) =>
    publicRequest(listQueryToPath("/admin/predictions/low-confidence", query), z.array(predictionItemSchema)),

  getModelComparison: (query?: AdminAnalyticsQuery) =>
    publicRequest(listQueryToPath("/admin/models/comparison", query), z.array(modelComparisonItemSchema)),
  getFeatureImportance: (query?: AdminAnalyticsQuery) =>
    publicRequest(listQueryToPath("/admin/models/feature-importance", query), z.array(featureImportanceItemSchema)),
  getFailedPredictions: (query?: FailedPredictionQuery) =>
    publicRequest(listQueryToPath("/admin/predictions/failed", query), z.array(failedPredictionItemSchema)),
  getFailedPredictionDetail: (failedId: string) =>
    publicRequest(`/admin/predictions/failed/${failedId}`, failedPredictionDetailSchema),
  getModelPerformanceTimeseries: (query?: AdminAnalyticsQuery) =>
    publicRequest(listQueryToPath("/admin/models/performance-timeseries", query), z.array(modelPerformancePointSchema)),
  getModelDriftSummary: (query?: AdminAnalyticsQuery) =>
    publicRequest(listQueryToPath("/admin/models/drift-summary", query), performanceDriftSummarySchema),

  getModelStrategies: (query?: StrategyQuery) =>
    publicRequest(listQueryToPath("/admin/models/strategies", query), z.array(modelStrategySchema)),
  autoSelectModelStrategy: () =>
    publicRequest("/admin/models/strategies/auto-select", strategySummarySchema, { method: "POST" }),
  updateModelStrategy: (
    strategyId: string,
    payload: { primaryModel: string; fallbackModel?: string | null; isActive: boolean }
  ) =>
    publicRequest(`/admin/models/strategies/${strategyId}`, modelStrategySchema, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  getEnsembleConfigs: (query?: AdminAnalyticsQuery) =>
    publicRequest(listQueryToPath("/admin/models/ensemble-configs", query), z.array(ensembleConfigSchema)),
  updateEnsembleConfig: (
    configId: string,
    payload: { weights: Array<{ model: string; weight: number }>; isActive?: boolean }
  ) =>
    publicRequest(`/admin/models/ensemble-configs/${configId}`, ensembleConfigSchema, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  getFeatureLab: (query?: AdminAnalyticsQuery) =>
    publicRequest(listQueryToPath("/admin/features/lab", query), featureLabSchema),
  runFeatureExperiment: (payload: {
    modelVersion: string;
    featureSetId: string;
    leagueId: string;
    from: string;
    to: string;
  }) =>
    publicRequest("/admin/features/lab/experiment", featureExperimentSchema, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getFeatureExperimentResults: (query?: FeatureExperimentResultsQuery) =>
    publicRequest(listQueryToPath("/admin/features/lab/results", query), z.array(featureExperimentResultSchema))
};
