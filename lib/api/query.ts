import type { SportKey } from "@/types/api-contract";

export interface ListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface MatchQuery extends ListQuery {
  sport?: SportKey | "all";
  leagueId?: string;
  teamId?: string;
  status?: string;
  date?: string;
  from?: string;
  to?: string;
  minConfidence?: number;
}

export interface PredictionQuery extends ListQuery {
  sport?: SportKey | "all";
  leagueId?: string;
  teamId?: string;
  status?: string;
  date?: string;
  from?: string;
  to?: string;
  minConfidence?: number;
  isLowConfidence?: boolean;
  isRecommended?: boolean;
}

export interface AdminAnalyticsQuery extends ListQuery {
  sport?: SportKey | "all";
  leagueId?: string;
  modelVersion?: string;
  predictionType?: string;
  isActive?: boolean;
  from?: string;
  to?: string;
}

export interface FailedPredictionQuery extends AdminAnalyticsQuery {
  onlyHighConfidenceFailed?: boolean;
}

export type StrategyQuery = AdminAnalyticsQuery;

export interface FeatureExperimentResultsQuery extends AdminAnalyticsQuery {
  featureSetId?: string;
  experimentId?: string;
}

export const toQueryString = (query?: Record<string, string | number | boolean | undefined | null>) => {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text.length > 0 ? `?${text}` : "";
};
