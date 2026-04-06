"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  ApiResponse,
  AuthTokens,
  AuthUser,
  CalibrationResult,
  CalibrationRunResponse,
  DashboardSummary,
  EnsembleConfig,
  FailedPredictionDetail,
  FailedPredictionItem,
  FeatureExperiment,
  FeatureExperimentResult,
  FeatureImportanceItem,
  FeatureLab,
  LeagueDetail,
  LeagueListItem,
  MatchDetail,
  MatchEvent,
  MatchListItem,
  MatchPrediction,
  MatchStats,
  ModelComparisonItem,
  ModelPerformancePoint,
  ModelStrategy,
  PerformanceDriftSummary,
  PredictionItem,
  PredictionRiskSummary,
  Sport,
  StandingRow,
  StrategySummary,
  TeamDetail,
  TeamFormPoint,
  TeamListItem,
  TeamSquadPlayer
} from "@/types/api-contract";
import type {
  AdminAnalyticsQuery,
  FailedPredictionQuery,
  FeatureExperimentResultsQuery,
  MatchQuery,
  PredictionQuery,
  StrategyQuery
} from "@/lib/api/query";
import type { AccountProfile, MembershipPlan, ModelInsight, PerformanceRecord } from "@/types/domain";

const listQueryOptions = {
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  retry: 1,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false
} satisfies Partial<UseQueryOptions>;

const detailQueryOptions = {
  staleTime: 2 * 60_000,
  gcTime: 15 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false
} satisfies Partial<UseQueryOptions>;

const liveQueryOptions = {
  staleTime: 8_000,
  gcTime: 5 * 60_000,
  retry: 1,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true
} satisfies Partial<UseQueryOptions>;

const buildListKey = <TQuery>(name: string, query?: TQuery) => [name, query ?? {}] as const;

const legacyModelsData: ModelInsight[] = [
  {
    id: "model-1",
    name: "Form Momentum",
    confidence: 84,
    dataReliability: 79,
    uncertainty: 18,
    explanation: "Son 10 mac performansi, rakip seviyesi ve kadro devamliligi ile skorlaniyor."
  },
  {
    id: "model-2",
    name: "Expected Score Engine",
    confidence: 77,
    dataReliability: 73,
    uncertainty: 22,
    explanation: "xG ve tempo agirlikli skor uretim modeli, lig ortalamalarina gore normalize edilir."
  }
];

const legacyPerformanceData: PerformanceRecord[] = [
  { period: "Gunluk", football: 72, basketball: 69, overall: 71 },
  { period: "Haftalik", football: 74, basketball: 70, overall: 72 },
  { period: "Aylik", football: 76, basketball: 73, overall: 75 }
];

const legacyMembershipData: MembershipPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    features: ["Gunun tahminleri", "Temel filtreleme", "Standart destek"]
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    recommended: true,
    features: ["Yuksek guven skoru listesi", "Gelismis filtre paneli", "Takim ve lig favorileri"]
  },
  {
    id: "elite",
    name: "Elite",
    priceMonthly: 99,
    features: ["Canli analiz panelleri", "Model aciklama katmani", "Oncelikli destek"]
  }
];

const legacyAccountData: AccountProfile = {
  id: "u-1",
  fullName: "Demo Kullanici",
  email: "demo@tahminx.app",
  favoriteLeagues: ["Super Lig", "Premier League"],
  favoriteTeams: ["Galatasaray", "Liverpool"],
  notifications: {
    liveAlerts: true,
    confidenceDropAlerts: true,
    weeklyDigest: false
  }
};

export const useSports = () => useQuery({ queryKey: ["sports"], queryFn: apiClient.getSports, ...listQueryOptions });

export const useAdminMe = (enabled = true) =>
  useQuery({
    queryKey: ["admin-auth-me"],
    queryFn: apiClient.getAdminMe,
    enabled,
    retry: false,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  });

export const useLeagues = (query?: MatchQuery) =>
  useQuery({ queryKey: buildListKey("leagues", query), queryFn: () => apiClient.getLeagues(query), ...listQueryOptions });

export const useLeagueDetail = (leagueId?: string) =>
  useQuery({
    queryKey: ["league-detail", leagueId],
    queryFn: () => apiClient.getLeagueDetail(leagueId as string),
    enabled: Boolean(leagueId),
    ...detailQueryOptions
  });

export const useLeagueStandings = (leagueId?: string) =>
  useQuery({
    queryKey: ["league-standings", leagueId],
    queryFn: () => apiClient.getLeagueStandings(leagueId as string),
    enabled: Boolean(leagueId),
    ...detailQueryOptions
  });

export const useTeams = (query?: MatchQuery) =>
  useQuery({ queryKey: buildListKey("teams", query), queryFn: () => apiClient.getTeams(query), ...listQueryOptions });

export const useTeamDetail = (teamId?: string) =>
  useQuery({
    queryKey: ["team-detail", teamId],
    queryFn: () => apiClient.getTeamDetail(teamId as string),
    enabled: Boolean(teamId),
    ...detailQueryOptions
  });

export const useTeamMatches = (teamId?: string, query?: MatchQuery) =>
  useQuery({
    queryKey: ["team-matches", teamId, query ?? {}],
    queryFn: () => apiClient.getTeamMatches(teamId as string, query),
    enabled: Boolean(teamId),
    ...detailQueryOptions
  });

export const useTeamForm = (teamId?: string) =>
  useQuery({
    queryKey: ["team-form", teamId],
    queryFn: () => apiClient.getTeamForm(teamId as string),
    enabled: Boolean(teamId),
    ...detailQueryOptions
  });

export const useTeamSquad = (teamId?: string) =>
  useQuery({
    queryKey: ["team-squad", teamId],
    queryFn: () => apiClient.getTeamSquad(teamId as string),
    enabled: Boolean(teamId),
    ...detailQueryOptions
  });

export const useMatches = (query?: MatchQuery) =>
  useQuery({ queryKey: buildListKey("matches", query), queryFn: () => apiClient.getMatches(query), ...listQueryOptions });

export const useTodayMatches = (query?: MatchQuery) =>
  useQuery({ queryKey: buildListKey("matches-today", query), queryFn: () => apiClient.getTodayMatches(query), ...listQueryOptions });

export const useTomorrowMatches = (query?: MatchQuery) =>
  useQuery({ queryKey: buildListKey("matches-tomorrow", query), queryFn: () => apiClient.getTomorrowMatches(query), ...listQueryOptions });

export const useLiveMatches = (query?: MatchQuery) =>
  useQuery({ queryKey: buildListKey("matches-live", query), queryFn: () => apiClient.getLiveMatches(query), ...liveQueryOptions });

export const useCompletedMatches = (query?: MatchQuery) =>
  useQuery({ queryKey: buildListKey("matches-completed", query), queryFn: () => apiClient.getCompletedMatches(query), ...listQueryOptions });

export const useMatchDetail = (matchId?: string) =>
  useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: () => apiClient.getMatchDetail(matchId as string),
    enabled: Boolean(matchId),
    ...detailQueryOptions
  });

export const useMatchEvents = (matchId?: string) =>
  useQuery({
    queryKey: ["match-events", matchId],
    queryFn: () => apiClient.getMatchEvents(matchId as string),
    enabled: Boolean(matchId),
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true
  });

export const useMatchStats = (matchId?: string) =>
  useQuery({
    queryKey: ["match-stats", matchId],
    queryFn: () => apiClient.getMatchStats(matchId as string),
    enabled: Boolean(matchId),
    ...detailQueryOptions
  });

export const useMatchPrediction = (matchId?: string) =>
  useQuery({
    queryKey: ["match-prediction", matchId],
    queryFn: () => apiClient.getMatchPrediction(matchId as string),
    enabled: Boolean(matchId),
    ...detailQueryOptions
  });

export const usePredictions = (query?: PredictionQuery) =>
  useQuery({ queryKey: buildListKey("predictions", query), queryFn: () => apiClient.getPredictions(query), ...listQueryOptions });

export const useHighConfidencePredictions = () =>
  useQuery({ queryKey: ["predictions-high-confidence"], queryFn: apiClient.getHighConfidencePredictions, ...listQueryOptions });

export const useDashboardAnalytics = () =>
  useQuery({ queryKey: ["analytics-dashboard"], queryFn: apiClient.getDashboardAnalytics, ...listQueryOptions });

export const useGuideSummary = () =>
  useQuery({ queryKey: ["guide-summary"], queryFn: apiClient.getGuideSummary, ...listQueryOptions });

export const useCalibrationResults = () =>
  useQuery({ queryKey: ["admin-calibration-results"], queryFn: apiClient.getCalibrationResults, ...detailQueryOptions });

export const usePredictionRiskSummary = () =>
  useQuery({ queryKey: ["admin-prediction-risk-summary"], queryFn: apiClient.getPredictionRiskSummary, ...detailQueryOptions });

export const useLowConfidencePredictions = (query?: PredictionQuery) =>
  useQuery({
    queryKey: buildListKey("admin-low-confidence-predictions", query),
    queryFn: () => apiClient.getLowConfidencePredictions(query),
    ...listQueryOptions
  });

export const useModelComparison = (query?: AdminAnalyticsQuery) =>
  useQuery({
    queryKey: buildListKey("admin-model-comparison", query),
    queryFn: () => apiClient.getModelComparison(query),
    ...listQueryOptions
  });

export const useFeatureImportance = (query?: AdminAnalyticsQuery) =>
  useQuery({
    queryKey: buildListKey("admin-feature-importance", query),
    queryFn: () => apiClient.getFeatureImportance(query),
    ...listQueryOptions
  });

export const useFailedPredictions = (query?: FailedPredictionQuery) =>
  useQuery({
    queryKey: buildListKey("admin-failed-predictions", query),
    queryFn: () => apiClient.getFailedPredictions(query),
    ...listQueryOptions
  });

export const useFailedPredictionDetail = (failedId?: string) =>
  useQuery({
    queryKey: ["admin-failed-prediction-detail", failedId],
    queryFn: () => apiClient.getFailedPredictionDetail(failedId as string),
    enabled: Boolean(failedId),
    ...detailQueryOptions
  });

export const useModelPerformanceTimeseries = (query?: AdminAnalyticsQuery) =>
  useQuery({
    queryKey: buildListKey("admin-model-performance-timeseries", query),
    queryFn: () => apiClient.getModelPerformanceTimeseries(query),
    ...listQueryOptions
  });

export const useModelDriftSummary = (query?: AdminAnalyticsQuery) =>
  useQuery({
    queryKey: buildListKey("admin-model-drift-summary", query),
    queryFn: () => apiClient.getModelDriftSummary(query),
    ...detailQueryOptions
  });

export const useModelStrategies = (query?: StrategyQuery) =>
  useQuery({
    queryKey: buildListKey("admin-model-strategies", query),
    queryFn: () => apiClient.getModelStrategies(query),
    ...listQueryOptions
  });

export const useEnsembleConfigs = (query?: AdminAnalyticsQuery) =>
  useQuery({
    queryKey: buildListKey("admin-ensemble-configs", query),
    queryFn: () => apiClient.getEnsembleConfigs(query),
    ...listQueryOptions
  });

export const useFeatureLab = (query?: AdminAnalyticsQuery) =>
  useQuery({
    queryKey: buildListKey("admin-feature-lab", query),
    queryFn: () => apiClient.getFeatureLab(query),
    ...detailQueryOptions
  });

export const useFeatureExperimentResults = (query?: FeatureExperimentResultsQuery) =>
  useQuery({
    queryKey: buildListKey("admin-feature-experiment-results", query),
    queryFn: () => apiClient.getFeatureExperimentResults(query),
    ...listQueryOptions
  });

export const useRunCalibrationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.runCalibration,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-calibration-results"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-prediction-risk-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-model-comparison"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-model-performance-timeseries"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-model-drift-summary"] });
    }
  });
};

export const useAdminLoginMutation = () =>
  useMutation<ApiResponse<AuthTokens>, Error, { email: string; password: string }>({
    mutationFn: apiClient.loginAdmin
  });

export const useAdminLogoutMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<{ loggedOut: boolean }>, Error, void>({
    mutationFn: apiClient.logoutAdmin,
    onSuccess: () => {
      void queryClient.removeQueries({ queryKey: ["admin-auth-me"] });
    }
  });
};

export const useAutoSelectStrategyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.autoSelectModelStrategy,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-model-strategies"] });
    }
  });
};

export const useUpdateStrategyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      strategyId: string;
      data: { primaryModel: string; fallbackModel?: string | null; isActive: boolean };
    }) => apiClient.updateModelStrategy(payload.strategyId, payload.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-model-strategies"] });
    }
  });
};

export const useUpdateEnsembleConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      configId: string;
      data: { weights: Array<{ model: string; weight: number }>; isActive?: boolean };
    }) => apiClient.updateEnsembleConfig(payload.configId, payload.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-ensemble-configs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-model-comparison"] });
    }
  });
};

export const useRunFeatureExperiment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      modelVersion: string;
      featureSetId: string;
      leagueId: string;
      from: string;
      to: string;
    }) => apiClient.runFeatureExperiment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-feature-experiment-results"] });
    }
  });
};

// Legacy aliases for existing screens that haven't migrated yet.
export const useDashboard = useDashboardAnalytics;
export const useModels = () =>
  useQuery<ApiResponse<ModelInsight[]>>({
    queryKey: ["legacy-models"],
    queryFn: async () => ({ success: true, data: legacyModelsData }),
    ...listQueryOptions
  });
export const usePerformance = () =>
  useQuery<ApiResponse<PerformanceRecord[]>>({
    queryKey: ["legacy-performance"],
    queryFn: async () => ({ success: true, data: legacyPerformanceData }),
    ...listQueryOptions
  });
export const useMembership = () =>
  useQuery<ApiResponse<MembershipPlan[]>>({
    queryKey: ["legacy-membership"],
    queryFn: async () => ({ success: true, data: legacyMembershipData }),
    ...listQueryOptions
  });
export const useAccount = () =>
  useQuery<ApiResponse<AccountProfile>>({
    queryKey: ["legacy-account"],
    queryFn: async () => ({ success: true, data: legacyAccountData }),
    ...listQueryOptions
  });

export type SportsQueryResult = ApiResponse<Sport[]>;
export type LeaguesQueryResult = ApiResponse<LeagueListItem[]>;
export type LeagueDetailQueryResult = ApiResponse<LeagueDetail>;
export type LeagueStandingsQueryResult = ApiResponse<StandingRow[]>;
export type TeamsQueryResult = ApiResponse<TeamListItem[]>;
export type TeamDetailQueryResult = ApiResponse<TeamDetail>;
export type TeamMatchesQueryResult = ApiResponse<MatchListItem[]>;
export type TeamFormQueryResult = ApiResponse<TeamFormPoint[]>;
export type TeamSquadQueryResult = ApiResponse<TeamSquadPlayer[]>;
export type MatchesQueryResult = ApiResponse<MatchListItem[]>;
export type MatchDetailQueryResult = ApiResponse<MatchDetail>;
export type MatchEventsQueryResult = ApiResponse<MatchEvent[]>;
export type MatchStatsQueryResult = ApiResponse<MatchStats>;
export type MatchPredictionQueryResult = ApiResponse<MatchPrediction>;
export type PredictionsQueryResult = ApiResponse<PredictionItem[]>;
export type DashboardQueryResult = ApiResponse<DashboardSummary>;
export type CalibrationResultsQueryResult = ApiResponse<CalibrationResult[]>;
export type CalibrationRunMutationResult = ApiResponse<CalibrationRunResponse>;
export type PredictionRiskSummaryQueryResult = ApiResponse<PredictionRiskSummary>;
export type LowConfidencePredictionsQueryResult = ApiResponse<PredictionItem[]>;
export type ModelComparisonQueryResult = ApiResponse<ModelComparisonItem[]>;
export type FeatureImportanceQueryResult = ApiResponse<FeatureImportanceItem[]>;
export type FailedPredictionsQueryResult = ApiResponse<FailedPredictionItem[]>;
export type FailedPredictionDetailQueryResult = ApiResponse<FailedPredictionDetail>;
export type ModelPerformanceTimeseriesQueryResult = ApiResponse<ModelPerformancePoint[]>;
export type ModelDriftSummaryQueryResult = ApiResponse<PerformanceDriftSummary>;
export type ModelStrategiesQueryResult = ApiResponse<ModelStrategy[]>;
export type AutoSelectStrategyMutationResult = ApiResponse<StrategySummary>;
export type EnsembleConfigsQueryResult = ApiResponse<EnsembleConfig[]>;
export type FeatureLabQueryResult = ApiResponse<FeatureLab>;
export type FeatureExperimentMutationResult = ApiResponse<FeatureExperiment>;
export type FeatureExperimentResultsQueryResult = ApiResponse<FeatureExperimentResult[]>;
