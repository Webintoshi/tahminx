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

export interface TeamComparisonQuery {
  homeTeamId: string;
  awayTeamId: string;
  leagueId?: string;
  seasonId?: string;
  window?: "last3" | "last5" | "last10";
}

const MAX_PAGE_SIZE = 100;

export const toQueryString = (query?: Record<string, string | number | boolean | undefined | null>) => {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    if (key === "pageSize" && typeof value === "number") {
      params.set(key, String(Math.min(Math.max(1, value), MAX_PAGE_SIZE)));
      return;
    }
    params.set(key, String(value));
  });
  const text = params.toString();
  return text.length > 0 ? `?${text}` : "";
};
