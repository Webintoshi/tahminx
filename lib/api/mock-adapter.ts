import type {
  ApiResponse,
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
  GuideSummary,
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
  PaginationMeta,
  PerformanceDriftSummary,
  PredictionItem,
  PredictionRiskSummary,
  Sport,
  StrategySummary,
  StandingRow,
  TeamDetail,
  TeamFormPoint,
  TeamListItem,
  TeamSquadPlayer
} from "@/types/api-contract";
import {
  calibrationResultsMock,
  calibrationRunMock,
  dashboardMock,
  ensembleConfigsMock,
  failedPredictionDetailsMock,
  failedPredictionsMock,
  featureExperimentMock,
  featureExperimentResultsMock,
  featureImportanceMock,
  featureLabMock,
  guideSummaryMock,
  leaguesMock,
  matchEventsMock,
  matchPredictionMock,
  matchesMock,
  matchStatsMock,
  modelComparisonMock,
  modelDriftSummaryMock,
  modelPerformanceTimeseriesMock,
  modelStrategiesMock,
  predictionRiskSummaryMock,
  predictionsMock,
  sportsMock,
  strategySummaryMock,
  standingsMock,
  teamFormMock,
  teamsMock,
  teamSquadMock
} from "@/lib/api/mock-contract-data";

const toNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBoolean = (value: string | null): boolean | undefined => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const createMeta = (page: number, pageSize: number, total: number): PaginationMeta => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
  generatedAt: new Date().toISOString()
});

const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
};

const ok = <T>(data: T, meta?: PaginationMeta): ApiResponse<T> => ({
  success: true,
  data,
  meta,
  error: null
});

const notFound = <T>(message: string): ApiResponse<T> => ({
  success: false,
  data: null as T,
  error: { code: "NOT_FOUND", message }
});

const applySort = <T>(
  items: T[],
  sortBy?: string | null,
  sortOrder?: string | null,
  getValue?: (item: T, key: string) => unknown
) => {
  if (!sortBy || !getValue) return items;
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    const av = getValue(a, sortBy);
    const bv = getValue(b, sortBy);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
    return String(av).localeCompare(String(bv)) * direction;
  });
};

const getQuery = (url: URL) => ({
  sport: url.searchParams.get("sport"),
  leagueId: url.searchParams.get("leagueId"),
  teamId: url.searchParams.get("teamId"),
  status: url.searchParams.get("status"),
  modelVersion: url.searchParams.get("modelVersion"),
  predictionType: url.searchParams.get("predictionType"),
  isActive: toBoolean(url.searchParams.get("isActive")),
  featureSetId: url.searchParams.get("featureSetId"),
  experimentId: url.searchParams.get("experimentId"),
  date: url.searchParams.get("date"),
  from: url.searchParams.get("from"),
  to: url.searchParams.get("to"),
  minConfidence: toNumber(url.searchParams.get("minConfidence"), 0),
  isLowConfidence: toBoolean(url.searchParams.get("isLowConfidence")),
  isRecommended: toBoolean(url.searchParams.get("isRecommended")),
  onlyHighConfidenceFailed: toBoolean(url.searchParams.get("onlyHighConfidenceFailed")),
  page: toNumber(url.searchParams.get("page"), 1),
  pageSize: toNumber(url.searchParams.get("pageSize"), 20),
  sortBy: url.searchParams.get("sortBy"),
  sortOrder: url.searchParams.get("sortOrder")
});

const inDateRange = (value: string | null | undefined, from?: string | null, to?: string | null, date?: string | null) => {
  if (!from && !to && !date) return true;
  if (!value) return false;
  const point = new Date(value);
  if (Number.isNaN(point.getTime())) return false;

  if (date) {
    const day = point.toISOString().slice(0, 10);
    if (day !== date) return false;
  }

  if (from) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(fromDate.getTime()) && point < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isNaN(toDate.getTime()) && point > toDate) return false;
  }

  return true;
};

const filterMatches = (query: ReturnType<typeof getQuery>, source: MatchListItem[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.teamId && item.homeTeamId !== query.teamId && item.awayTeamId !== query.teamId) return false;
    if (query.status && query.status !== "all" && item.status !== query.status) return false;
    if (query.minConfidence > 0 && (item.confidenceScore ?? 0) < query.minConfidence) return false;
    if (!inDateRange(item.kickoffAt, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "confidenceScore") return item.confidenceScore ?? 0;
    if (key === "kickoffAt") return item.kickoffAt;
    if (key === "status") return item.status;
    return item.kickoffAt;
  });
};

const filterPredictions = (query: ReturnType<typeof getQuery>, source: PredictionItem[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.teamId) {
      const match = matchesMock.find((m) => m.id === item.matchId);
      if (!match || (match.homeTeamId !== query.teamId && match.awayTeamId !== query.teamId)) return false;
    }
    if (query.status && query.status !== "all" && item.riskLevel !== query.status) return false;
    if (query.minConfidence > 0 && (item.confidenceScore ?? 0) < query.minConfidence) return false;
    if (query.isLowConfidence !== undefined && Boolean(item.isLowConfidence) !== query.isLowConfidence) return false;
    if (query.isRecommended !== undefined && Boolean(item.isRecommended) !== query.isRecommended) return false;
    if (!inDateRange(item.kickoffAt, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "confidenceScore") return item.confidenceScore ?? 0;
    if (key === "kickoffAt") return item.kickoffAt;
    if (key === "riskLevel") return item.riskLevel;
    return item.confidenceScore ?? 0;
  });
};

const filterModelComparison = (query: ReturnType<typeof getQuery>, source: ModelComparisonItem[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.modelVersion && item.modelVersion !== query.modelVersion) return false;
    if (!inDateRange(item.updatedAt ?? null, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "accuracy") return item.accuracy ?? 0;
    if (key === "logLoss") return item.logLoss ?? 0;
    if (key === "brierScore") return item.brierScore ?? 0;
    if (key === "avgConfidenceScore") return item.avgConfidenceScore ?? 0;
    if (key === "sampleSize") return item.sampleSize ?? 0;
    if (key === "updatedAt") return item.updatedAt ?? "";
    return item.updatedAt ?? "";
  });
};

const filterFeatureImportance = (query: ReturnType<typeof getQuery>, source: FeatureImportanceItem[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.modelVersion && item.modelVersion !== query.modelVersion) return false;
    if (!inDateRange(item.updatedAt ?? null, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "updatedAt") return item.updatedAt ?? "";
    if (key === "modelVersion") return item.modelVersion;
    return item.updatedAt ?? "";
  });
};

const filterFailedPredictions = (query: ReturnType<typeof getQuery>, source: FailedPredictionItem[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.modelVersion && item.modelVersion !== query.modelVersion) return false;
    if (query.onlyHighConfidenceFailed && (item.confidenceScore ?? 0) < 75) return false;
    if (!inDateRange(item.updatedAt ?? null, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "confidenceScore") return item.confidenceScore ?? 0;
    if (key === "updatedAt") return item.updatedAt ?? "";
    return item.updatedAt ?? "";
  });
};

const filterPerformancePoints = (query: ReturnType<typeof getQuery>, source: ModelPerformancePoint[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.modelVersion && item.modelVersion !== query.modelVersion) return false;
    if (!inDateRange(item.timestamp, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "accuracy") return item.accuracy ?? 0;
    if (key === "logLoss") return item.logLoss ?? 0;
    if (key === "brierScore") return item.brierScore ?? 0;
    if (key === "avgConfidenceScore") return item.avgConfidenceScore ?? 0;
    if (key === "timestamp") return item.timestamp;
    return item.timestamp;
  });
};

const filterModelStrategies = (query: ReturnType<typeof getQuery>, source: ModelStrategy[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.predictionType && item.predictionType !== query.predictionType) return false;
    if (query.isActive !== undefined && item.isActive !== query.isActive) return false;
    if (!inDateRange(item.updatedAt ?? null, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "updatedAt") return item.updatedAt ?? "";
    if (key === "predictionType") return item.predictionType;
    if (key === "isActive") return item.isActive ? 1 : 0;
    return item.updatedAt ?? "";
  });
};

const filterEnsembleConfigs = (query: ReturnType<typeof getQuery>, source: EnsembleConfig[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.modelVersion && item.modelVersion !== query.modelVersion) return false;
    if (query.isActive !== undefined && Boolean(item.isActive) !== query.isActive) return false;
    if (!inDateRange(item.updatedAt ?? null, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "updatedAt") return item.updatedAt ?? "";
    if (key === "modelVersion") return item.modelVersion ?? "";
    return item.updatedAt ?? "";
  });
};

const filterFeatureExperimentResults = (query: ReturnType<typeof getQuery>, source: FeatureExperimentResult[]) => {
  const filtered = source.filter((item) => {
    if (query.sport && query.sport !== "all") {
      const league = leaguesMock.find((row) => row.id === item.leagueId);
      if (!league || league.sportKey !== query.sport) return false;
    }
    if (query.leagueId && item.leagueId !== query.leagueId) return false;
    if (query.modelVersion && item.modelVersion !== query.modelVersion) return false;
    if (query.featureSetId && item.featureSetId !== query.featureSetId) return false;
    if (query.experimentId && item.experimentId !== query.experimentId) return false;
    if (!inDateRange(item.updatedAt ?? null, query.from, query.to, query.date)) return false;
    return true;
  });

  return applySort(filtered, query.sortBy, query.sortOrder, (item, key) => {
    if (key === "accuracy") return item.accuracy ?? 0;
    if (key === "logLoss") return item.logLoss ?? 0;
    if (key === "brierScore") return item.brierScore ?? 0;
    if (key === "sampleSize") return item.sampleSize ?? 0;
    if (key === "updatedAt") return item.updatedAt ?? "";
    return item.updatedAt ?? "";
  });
};

export async function getMockResponse(path: string): Promise<ApiResponse<unknown>> {
  const url = new URL(path, "http://localhost");
  const query = getQuery(url);
  const pathname = url.pathname;
  const now = new Date();

  if (pathname === "/api/v1/sports") {
    return ok<Sport[]>(sportsMock);
  }

  if (pathname === "/api/v1/leagues") {
    const list = leaguesMock.filter((item) => !query.sport || query.sport === "all" || item.sportKey === query.sport);
    const pageItems = paginate<LeagueListItem>(list, query.page, query.pageSize);
    return ok<LeagueListItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname.match(/^\/api\/v1\/leagues\/[^/]+$/)) {
    const id = pathname.split("/")[4];
    const league = leaguesMock.find((item) => item.id === id);
    if (!league) return notFound<LeagueDetail>("League not found");
    return ok<LeagueDetail>(league);
  }

  if (pathname.match(/^\/api\/v1\/leagues\/[^/]+\/standings$/)) {
    const id = pathname.split("/")[4];
    return ok<StandingRow[]>(standingsMock[id] ?? []);
  }

  if (pathname === "/api/v1/teams") {
    const list = teamsMock.filter((item) => {
      if (query.sport && query.sport !== "all" && item.sportKey !== query.sport) return false;
      if (query.leagueId && item.leagueId !== query.leagueId) return false;
      return true;
    });

    const pageItems = paginate<TeamListItem>(list, query.page, query.pageSize);
    return ok<TeamListItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname.match(/^\/api\/v1\/teams\/[^/]+$/)) {
    const id = pathname.split("/")[4];
    const team = teamsMock.find((item) => item.id === id);
    if (!team) return notFound<TeamDetail>("Team not found");
    return ok<TeamDetail>(team);
  }

  if (pathname.match(/^\/api\/v1\/teams\/[^/]+\/matches$/)) {
    const id = pathname.split("/")[4];
    const list = matchesMock.filter((item) => item.homeTeamId === id || item.awayTeamId === id);
    const sorted = applySort(list, query.sortBy, query.sortOrder, (item, key) => {
      if (key === "confidenceScore") return item.confidenceScore ?? 0;
      return item.kickoffAt;
    });
    const pageItems = paginate<MatchListItem>(sorted, query.page, query.pageSize);
    return ok<MatchListItem[]>(pageItems, createMeta(query.page, query.pageSize, sorted.length));
  }

  if (pathname.match(/^\/api\/v1\/teams\/[^/]+\/form$/)) {
    const id = pathname.split("/")[4];
    return ok<TeamFormPoint[]>(teamFormMock[id] ?? []);
  }

  if (pathname.match(/^\/api\/v1\/teams\/[^/]+\/squad$/)) {
    const id = pathname.split("/")[4];
    return ok<TeamSquadPlayer[]>(teamSquadMock[id] ?? []);
  }

  if (pathname === "/api/v1/matches") {
    const list = filterMatches(query, matchesMock);
    const pageItems = paginate<MatchListItem>(list, query.page, query.pageSize);
    return ok<MatchListItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname === "/api/v1/matches/today") {
    const today = now.toISOString().slice(0, 10);
    const list = matchesMock.filter((item) => new Date(item.kickoffAt).toISOString().slice(0, 10) === today);
    return ok<MatchListItem[]>(list);
  }

  if (pathname === "/api/v1/matches/tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = tomorrow.toISOString().slice(0, 10);
    const list = matchesMock.filter((item) => new Date(item.kickoffAt).toISOString().slice(0, 10) === day);
    return ok<MatchListItem[]>(list);
  }

  if (pathname === "/api/v1/matches/live") {
    return ok<MatchListItem[]>(matchesMock.filter((item) => item.status === "live"));
  }

  if (pathname === "/api/v1/matches/completed") {
    return ok<MatchListItem[]>(matchesMock.filter((item) => item.status === "completed"));
  }

  if (pathname.match(/^\/api\/v1\/matches\/[^/]+$/)) {
    const id = pathname.split("/")[4];
    const match = matchesMock.find((item) => item.id === id);
    if (!match) return notFound<MatchDetail>("Match not found");
    return ok<MatchDetail>(match);
  }

  if (pathname.match(/^\/api\/v1\/matches\/[^/]+\/events$/)) {
    const id = pathname.split("/")[4];
    return ok<MatchEvent[]>(matchEventsMock[id] ?? []);
  }

  if (pathname.match(/^\/api\/v1\/matches\/[^/]+\/stats$/)) {
    const id = pathname.split("/")[4];
    return ok<MatchStats>(matchStatsMock[id] ?? {});
  }

  if (pathname.match(/^\/api\/v1\/matches\/[^/]+\/prediction$/)) {
    const id = pathname.split("/")[4];
    const prediction = matchPredictionMock[id];
    if (!prediction) return notFound<MatchPrediction>("Prediction not found");
    return ok<MatchPrediction>(prediction);
  }

  if (pathname === "/api/v1/predictions") {
    const list = filterPredictions(query, predictionsMock);
    const pageItems = paginate<PredictionItem>(list, query.page, query.pageSize);
    return ok<PredictionItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname === "/api/v1/predictions/high-confidence") {
    return ok<PredictionItem[]>(predictionsMock.filter((item) => (item.confidenceScore ?? 0) >= 78));
  }

  if (pathname === "/api/v1/analytics/dashboard") {
    return ok<DashboardSummary>(dashboardMock);
  }

  if (pathname === "/api/v1/guide/summary") {
    return ok<GuideSummary>(guideSummaryMock);
  }

  if (pathname === "/api/v1/admin/calibration/results") {
    return ok<CalibrationResult[]>(calibrationResultsMock);
  }

  if (pathname === "/api/v1/admin/calibration/run") {
    return ok<CalibrationRunResponse>(calibrationRunMock);
  }

  if (pathname === "/api/v1/admin/predictions/risk-summary") {
    return ok<PredictionRiskSummary>(predictionRiskSummaryMock);
  }

  if (pathname === "/api/v1/admin/predictions/low-confidence") {
    const lowList = predictionsMock.filter((item) => item.isLowConfidence || (item.confidenceScore ?? 0) < 67);
    const list = filterPredictions(query, lowList);
    const pageItems = paginate<PredictionItem>(list, query.page, query.pageSize);
    return ok<PredictionItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname === "/api/v1/admin/models/comparison") {
    const list = filterModelComparison(query, modelComparisonMock);
    const pageItems = paginate<ModelComparisonItem>(list, query.page, query.pageSize);
    return ok<ModelComparisonItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname === "/api/v1/admin/models/feature-importance") {
    const list = filterFeatureImportance(query, featureImportanceMock);
    const pageItems = paginate<FeatureImportanceItem>(list, query.page, query.pageSize);
    return ok<FeatureImportanceItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname === "/api/v1/admin/predictions/failed") {
    const list = filterFailedPredictions(query, failedPredictionsMock);
    const pageItems = paginate<FailedPredictionItem>(list, query.page, query.pageSize);
    return ok<FailedPredictionItem[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname.match(/^\/api\/v1\/admin\/predictions\/failed\/[^/]+$/)) {
    const id = pathname.split("/")[6];
    const detail = failedPredictionDetailsMock[id];
    if (!detail) return notFound<FailedPredictionDetail>("Failed prediction detail not found");
    return ok<FailedPredictionDetail>(detail);
  }

  if (pathname === "/api/v1/admin/models/performance-timeseries") {
    const list = filterPerformancePoints(query, modelPerformanceTimeseriesMock);
    const pageItems = paginate<ModelPerformancePoint>(list, query.page, query.pageSize);
    return ok<ModelPerformancePoint[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname === "/api/v1/admin/models/drift-summary") {
    return ok<PerformanceDriftSummary>(modelDriftSummaryMock);
  }

  if (pathname === "/api/v1/admin/models/strategies") {
    const list = filterModelStrategies(query, modelStrategiesMock);
    const pageItems = paginate<ModelStrategy>(list, query.page, query.pageSize);
    return ok<ModelStrategy[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname === "/api/v1/admin/models/strategies/auto-select") {
    return ok<StrategySummary>(strategySummaryMock);
  }

  if (pathname.match(/^\/api\/v1\/admin\/models\/strategies\/[^/]+$/)) {
    const id = pathname.split("/")[6];
    const strategy = modelStrategiesMock.find((item) => item.id === id);
    if (!strategy) return notFound<ModelStrategy>("Model strategy not found");
    return ok<ModelStrategy>({
      ...strategy,
      updatedAt: new Date().toISOString()
    });
  }

  if (pathname === "/api/v1/admin/models/ensemble-configs") {
    const list = filterEnsembleConfigs(query, ensembleConfigsMock);
    const pageItems = paginate<EnsembleConfig>(list, query.page, query.pageSize);
    return ok<EnsembleConfig[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  if (pathname.match(/^\/api\/v1\/admin\/models\/ensemble-configs\/[^/]+$/)) {
    const id = pathname.split("/")[6];
    const config = ensembleConfigsMock.find((item) => item.id === id);
    if (!config) return notFound<EnsembleConfig>("Ensemble config not found");
    return ok<EnsembleConfig>({
      ...config,
      normalizedWeightTotal: Number(config.weights.reduce((sum, item) => sum + item.weight, 0).toFixed(4)),
      updatedAt: new Date().toISOString()
    });
  }

  if (pathname === "/api/v1/admin/features/lab") {
    return ok<FeatureLab>(featureLabMock);
  }

  if (pathname === "/api/v1/admin/features/lab/experiment") {
    return ok<FeatureExperiment>({
      ...featureExperimentMock,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  if (pathname === "/api/v1/admin/features/lab/results") {
    const list = filterFeatureExperimentResults(query, featureExperimentResultsMock);
    const pageItems = paginate<FeatureExperimentResult>(list, query.page, query.pageSize);
    return ok<FeatureExperimentResult[]>(pageItems, createMeta(query.page, query.pageSize, list.length));
  }

  return {
    success: false,
    data: null,
    error: {
      code: "UNSUPPORTED_ENDPOINT",
      message: `${pathname} is not mocked`
    }
  };
}
