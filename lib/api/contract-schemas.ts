import { z } from "zod";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const asNullableString = (value: unknown) => {
  const normalized = asString(value, "");
  return normalized ? normalized : null;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const asPercent = (value: unknown) => {
  const numeric = asNumber(value);
  if (numeric == null) return null;
  return Math.abs(numeric) <= 1 ? Number((numeric * 100).toFixed(2)) : numeric;
};

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const normalizeStatus = (value: unknown) => {
  switch (asString(value).toLowerCase()) {
    case "live":
      return "live";
    case "completed":
      return "completed";
    case "postponed":
      return "postponed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "scheduled";
  }
};

const inferSportKey = (value: Record<string, unknown>) => {
  const league = asRecord(value.league);
  const nestedSport = asRecord(value.sport);
  const candidates = [
    value.sportKey,
    value.sport,
    value.sportCode,
    nestedSport?.key,
    nestedSport?.code,
    league?.sportKey,
    league?.sport
  ]
    .map((item) => asString(item).toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes("basket")) return "basketball";
    if (candidate.includes("foot") || candidate.includes("soccer")) return "football";
  }

  const leagueName = asString(league?.name ?? value.leagueName).toLowerCase();
  if (leagueName.includes("nba") || leagueName.includes("basket")) return "basketball";
  return "football";
};

const deriveRiskLevel = (confidenceScore: number | null, isLowConfidence: boolean, riskFlags: string[]) => {
  if (isLowConfidence || (confidenceScore ?? 0) < 67) return "high";
  if (riskFlags.length > 0 || (confidenceScore ?? 0) < 82) return "medium";
  return "low";
};

const normalizeLeagueListItem = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("sportId" in record && "sportKey" in record && "country" in record && "season" in record) {
    return record;
  }

  return {
    id: asString(record.id),
    sportId: asString(record.sportId, "unknown"),
    sportKey: asString(record.sportKey, inferSportKey(record)),
    name: asString(record.name, "League"),
    country: asString(record.country, "-"),
    season: asString(record.season, asString(record.slug, "-")),
    logoUrl: asNullableString(record.logoUrl),
    updatedAt: asNullableString(record.updatedAt)
  };
};

const normalizeTeamListItem = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("leagueId" in record && "sportKey" in record) {
    return record;
  }

  const sport = asRecord(record.sport);
  const inferredSportKey = inferSportKey({ ...record, sport });

  return {
    id: asString(record.id),
    leagueId: asString(record.leagueId, "unknown"),
    sportId: asString(record.sportId, "unknown"),
    sportKey: asString(record.sportKey, inferredSportKey),
    name: asString(record.name, "Team"),
    shortName: asNullableString(record.shortName),
    city: asNullableString(record.city ?? record.country),
    logoUrl: asNullableString(record.logoUrl)
  };
};

const normalizeTeamDetail = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  const source = asRecord(record.team) ?? record;
  const metrics = asRecord(record.homeAwayMetrics);
  const normalized = asRecord(normalizeTeamListItem(source));
  if (!normalized) return value;

  const homeAvgScored = asNumber(metrics?.homeAvgScored);
  const homeAvgConceded = asNumber(metrics?.homeAvgConceded);
  const awayAvgScored = asNumber(metrics?.awayAvgScored);
  const awayAvgConceded = asNumber(metrics?.awayAvgConceded);

  const average = (values: Array<number | null>) => {
    const valid = values.filter((item): item is number => item !== null);
    if (valid.length === 0) return null;
    return valid.reduce((sum, item) => sum + item, 0) / valid.length;
  };

  return {
    ...normalized,
    country: asNullableString(source.country),
    foundedYear: asNumber(source.foundedYear),
    coach: asNullableString(source.coach),
    homeMetric: asNumber(source.homeMetric) ?? homeAvgScored,
    awayMetric: asNumber(source.awayMetric) ?? awayAvgScored,
    attackMetric: asNumber(source.attackMetric) ?? average([homeAvgScored, awayAvgScored]),
    defenseMetric: asNumber(source.defenseMetric) ?? average([homeAvgConceded, awayAvgConceded])
  };
};

const normalizeMatchListItem = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("sportKey" in record && "leagueName" in record && "homeTeamName" in record && "kickoffAt" in record) {
    return record;
  }

  const league = asRecord(record.league);
  const homeTeam = asRecord(record.homeTeam);
  const awayTeam = asRecord(record.awayTeam);

  return {
    id: asString(record.id ?? record.matchId),
    sportKey: inferSportKey(record),
    leagueId: asString(record.leagueId ?? league?.id),
    leagueName: asString(record.leagueName ?? league?.name, "Lig bilgisi yok"),
    homeTeamId: asString(record.homeTeamId ?? homeTeam?.id),
    awayTeamId: asString(record.awayTeamId ?? awayTeam?.id),
    homeTeamName: asString(record.homeTeamName ?? homeTeam?.name, "Ev sahibi"),
    awayTeamName: asString(record.awayTeamName ?? awayTeam?.name, "Deplasman"),
    homeLogoUrl: asNullableString(record.homeLogoUrl ?? homeTeam?.logoUrl ?? homeTeam?.logo),
    awayLogoUrl: asNullableString(record.awayLogoUrl ?? awayTeam?.logoUrl ?? awayTeam?.logo),
    kickoffAt: asString(record.kickoffAt ?? record.matchDate ?? record.date ?? record.updatedAt),
    status: normalizeStatus(record.status),
    scoreHome: asNumber(record.scoreHome ?? record.homeScore),
    scoreAway: asNumber(record.scoreAway ?? record.awayScore),
    confidenceScore: asNumber(record.confidenceScore)
  };
};

const normalizeMatchDetail = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  const source = asRecord(record.overview) ?? record;
  const normalized = asRecord(normalizeMatchListItem(source));

  if (!normalized) return value;

  const prediction = asRecord(record.prediction);
  const expectedScore = asRecord(prediction?.expectedScore);
  const explanation = asRecord(prediction?.explanation);
  const explanationPayload = asRecord(explanation?.explanation);

  return {
    ...normalized,
    venue: asNullableString(source.venue),
    round: asNullableString(source.round),
    summary: asNullableString(
      prediction?.summary ??
      source.summary ??
      explanationPayload?.summary
    ),
    expectedScoreHome: asNumber(source.expectedScoreHome ?? expectedScore?.home),
    expectedScoreAway: asNumber(source.expectedScoreAway ?? expectedScore?.away),
    riskFlags: asStringArray(source.riskFlags ?? record.riskFlags ?? prediction?.riskFlags),
    h2hSummary: asNullableString(source.h2hSummary)
  };
};

const normalizeMatchPrediction = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  const probabilities = asRecord(record.probabilities);
  const expectedScore = asRecord(record.expectedScore);

  return {
    matchId: asString(record.matchId ?? record.id),
    expectedScore: {
      home: asNumber(expectedScore?.home),
      away: asNumber(expectedScore?.away)
    },
    probabilities: {
      home: asNumber(probabilities?.home ?? probabilities?.homeWin) ?? 0,
      draw: asNumber(probabilities?.draw),
      away: asNumber(probabilities?.away ?? probabilities?.awayWin) ?? 0
    },
    confidenceScore: asNumber(record.confidenceScore),
    riskFlags: asStringArray(record.riskFlags),
    modelExplanation: asNullableString(record.modelExplanation ?? record.summary ?? record.avoidReason),
    summary: asNullableString(record.summary ?? record.modelExplanation),
    isLowConfidence: Boolean(record.isLowConfidence) || Boolean(record.avoidReason),
    isRecommended: Boolean(record.isRecommended)
  };
};

const normalizeTeamFormList = (value: unknown): unknown => {
  const record = asRecord(value);
  if (record && "data" in record) {
    return Array.isArray(record.data) ? record.data : [];
  }

  return Array.isArray(value) ? value : [];
};

const normalizeMatchStats = (value: unknown): unknown => {
  if (Array.isArray(value) || value == null) {
    return {};
  }

  const record = asRecord(value);
  if (!record) return {};

  return record;
};

const normalizePredictionItem = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("sportKey" in record && "leagueId" in record && "homeTeamName" in record && "modelSummary" in record) {
    return record;
  }

  const league = asRecord(record.league);
  const homeTeam = asRecord(record.homeTeam);
  const awayTeam = asRecord(record.awayTeam);
  const expectedScore = asRecord(record.expectedScore);
  const probabilities = asRecord(record.probabilities);
  const confidenceScore = asNumber(record.confidenceScore);
  const riskFlags = asStringArray(record.riskFlags);
  const isLowConfidence = Boolean(record.isLowConfidence) || Boolean(record.avoidReason) || (confidenceScore ?? 0) < 67;

  return {
    id: asString(record.id ?? record.matchId),
    matchId: asString(record.matchId ?? record.id),
    sportKey: inferSportKey(record),
    leagueId: asString(record.leagueId ?? league?.id),
    leagueName: asString(record.leagueName ?? league?.name, "Lig bilgisi yok"),
    homeTeamName: asString(record.homeTeamName ?? homeTeam?.name ?? record.homeTeam, "Ev"),
    awayTeamName: asString(record.awayTeamName ?? awayTeam?.name ?? record.awayTeam, "Dep"),
    kickoffAt: asString(record.kickoffAt ?? record.matchDate ?? record.updatedAt),
    confidenceScore,
    riskLevel:
      asString(record.riskLevel) === "low" || asString(record.riskLevel) === "medium" || asString(record.riskLevel) === "high"
        ? asString(record.riskLevel)
        : deriveRiskLevel(confidenceScore, isLowConfidence, riskFlags),
    expectedScore: {
      home: asNumber(expectedScore?.home),
      away: asNumber(expectedScore?.away)
    },
    probabilities: {
      home: asNumber(probabilities?.home ?? probabilities?.homeWin) ?? 0,
      draw: asNumber(probabilities?.draw),
      away: asNumber(probabilities?.away ?? probabilities?.awayWin) ?? 0
    },
    modelSummary: asString(
      record.modelSummary ?? record.summary ?? record.modelExplanation ?? record.avoidReason,
      "Model notu bulunmuyor."
    ),
    riskFlags,
    isLowConfidence,
    isRecommended: Boolean(record.isRecommended) && !isLowConfidence
  };
};

const normalizeCalibrationHealthSummary = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length > 0 ? normalizeCalibrationHealthSummary(value[0]) : null;
  }

  const record = asRecord(value);
  if (!record) return value ?? null;

  return {
    status: asNullableString(record.status),
    brierScore: asNumber(record.brierScore),
    ece: asNumber(record.ece),
    reliability: asNumber(record.reliability),
    note: asNullableString(record.note),
    updatedAt: asNullableString(record.updatedAt)
  };
};

const normalizeRiskDistributionSummary = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("low" in record && "medium" in record && "high" in record) {
    return record;
  }

  const total = Object.values(record).reduce<number>((sum, item) => sum + (asNumber(item) ?? 0), 0);
  return {
    low: 0,
    medium: total,
    high: 0,
    updatedAt: null
  };
};

const normalizeDashboardSummary = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if (
    "highConfidencePredictionCount" in record &&
    "updatedLeagues" in record &&
    "highConfidencePredictions" in record &&
    "recentPredictions" in record
  ) {
    return record;
  }

  const highConfidencePredictions = Array.isArray(record.highConfidencePredictions)
    ? record.highConfidencePredictions.map(normalizePredictionItem)
    : [];
  const recentPredictionsSource = Array.isArray(record.recentPredictions)
    ? record.recentPredictions
    : Array.isArray(record.recentPredictionOverview)
      ? record.recentPredictionOverview
      : [];
  const recentPredictions = recentPredictionsSource.map(normalizePredictionItem);
  const updatedLeagues = Array.isArray(record.updatedLeagues) ? record.updatedLeagues.map(normalizeLeagueListItem) : [];
  const todayMatches = Array.isArray(record.todayMatches) ? record.todayMatches.map(normalizeMatchListItem) : [];
  const calibratedHighConfidenceCount = asNumber(record.calibratedHighConfidenceCount);
  const lowConfidenceCount = asNumber(record.lowConfidenceCount);
  const rawRiskDistribution = asRecord(record.riskDistribution);

  return {
    todayMatchCount: asNumber(record.todayMatchCount) ?? todayMatches.length,
    liveMatchCount: asNumber(record.liveMatchCount) ?? 0,
    highConfidencePredictionCount:
      asNumber(record.highConfidencePredictionCount) ??
      calibratedHighConfidenceCount ??
      highConfidencePredictions.length,
    updatedLeagues,
    highConfidencePredictions,
    recentPredictions,
    todayMatches,
    miniTrends: Array.isArray(record.miniTrends)
      ? record.miniTrends
      : [
          { label: "Matches", values: [asNumber(record.todayMatchCount) ?? 0, asNumber(record.liveMatchCount) ?? 0] },
          {
            label: "Predictions",
            values: [calibratedHighConfidenceCount ?? highConfidencePredictions.length, lowConfidenceCount ?? 0]
          }
        ],
    calibratedHighConfidenceCount,
    lowConfidenceCount,
    avgConfidenceScore: asNumber(record.avgConfidenceScore),
    riskDistribution:
      rawRiskDistribution && "low" in rawRiskDistribution && "medium" in rawRiskDistribution && "high" in rawRiskDistribution
        ? rawRiskDistribution
        : {
            low: calibratedHighConfidenceCount ?? highConfidencePredictions.length,
            medium: rawRiskDistribution
              ? Object.values(rawRiskDistribution).reduce<number>((sum, item) => sum + (asNumber(item) ?? 0), 0)
              : 0,
            high: lowConfidenceCount ?? 0,
            updatedAt: null
          },
    calibrationHealthSummary: normalizeCalibrationHealthSummary(record.calibrationHealthSummary)
  };
};

const normalizePredictionRiskSummary = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("low" in record && "medium" in record && "high" in record) {
    return {
      ...record,
      riskFlagsTop: Array.isArray(record.riskFlagsTop)
        ? record.riskFlagsTop
        : Object.entries(asRecord(record.riskDistribution) ?? {})
            .map(([flag, count]) => ({ flag, count: asNumber(count) ?? 0 }))
            .sort((left, right) => right.count - left.count)
            .slice(0, 8)
    };
  }

  const totalPredictions = asNumber(record.totalPredictions) ?? 0;
  const low = asNumber(record.recommendedCount) ?? 0;
  const high = asNumber(record.lowConfidenceCount) ?? 0;

  return {
    totalPredictions,
    low,
    medium: Math.max(totalPredictions - low - high, 0),
    high,
    riskFlagsTop: Object.entries(asRecord(record.riskDistribution) ?? {})
      .map(([flag, count]) => ({ flag, count: asNumber(count) ?? 0 }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
    calibrationHealthSummary: normalizeCalibrationHealthSummary(record.calibrationHealthSummary),
    updatedAt: asNullableString(record.updatedAt)
  };
};

const normalizeModelComparisonItem = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("modelVersion" in record && "sportKey" in record) {
    return {
      ...record,
      accuracy: asPercent(record.accuracy),
      calibrationQuality: asPercent(record.calibrationQuality),
      avgConfidenceScore: asPercent(record.avgConfidenceScore)
    };
  }

  const league = asRecord(record.league);

  return {
    modelVersion: asString(record.modelVersion ?? record.modelName ?? record.modelKey, "Unknown model"),
    sportKey: asString(record.sportKey ?? record.sport, inferSportKey(record)),
    leagueId: asNullableString(record.leagueId ?? league?.id),
    leagueName: asNullableString(record.leagueName ?? league?.name),
    accuracy: asPercent(record.accuracy),
    logLoss: asNumber(record.logLoss),
    brierScore: asNumber(record.brierScore),
    avgConfidenceScore: asPercent(record.avgConfidenceScore),
    calibrationQuality: asPercent(record.calibrationQuality),
    sampleSize: asNumber(record.sampleSize),
    metrics: Array.isArray(record.metrics) ? record.metrics : undefined,
    updatedAt: asNullableString(record.updatedAt)
  };
};

const normalizeFeatureImportanceItem = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("features" in record && Array.isArray(record.features)) {
    return record;
  }

  return {
    modelVersion: asString(record.modelVersion ?? record.modelName ?? record.modelKey, "Unknown model"),
    sportKey: asString(record.sportKey ?? record.sport, inferSportKey(record)),
    updatedAt: asNullableString(record.updatedAt),
    features: [
      {
        feature: asString(record.feature ?? record.featureName, "Unknown feature"),
        score: asNumber(record.score ?? record.importanceScore) ?? 0,
        direction: asString(record.direction, "neutral"),
        description: asNullableString(record.description)
      }
    ]
  };
};

const normalizeFailedPredictionItem = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("matchLabel" in record && "predictedResult" in record && "actualResult" in record) {
    return record;
  }

  const league = asRecord(record.league);
  const homeTeam = asRecord(record.homeTeam);
  const awayTeam = asRecord(record.awayTeam);
  const probabilities = asRecord(record.probabilities);
  const expectedScore = asRecord(record.expectedScore);

  return {
    id: asString(record.id),
    matchId: asString(record.matchId ?? record.id),
    matchLabel: `${asString(homeTeam?.name, "Ev sahibi")} vs ${asString(awayTeam?.name, "Deplasman")}`,
    sportKey: asString(record.sportKey ?? record.sport, inferSportKey(record)),
    leagueId: asString(record.leagueId ?? league?.id),
    leagueName: asString(record.leagueName ?? league?.name, "Lig bilgisi yok"),
    modelVersion: asNullableString(record.modelVersion ?? record.modelName ?? record.modelKey),
    predictedResult: asString(record.predictedResult ?? record.predictedOutcome, "-"),
    actualResult: asString(record.actualResult ?? record.actualOutcome, "-"),
    confidenceScore: asPercent(record.confidenceScore),
    riskFlags: asStringArray(record.riskFlags),
    failureReasonSummary: asNullableString(record.failureReasonSummary ?? record.failureReason ?? record.summary),
    updatedAt: asNullableString(record.updatedAt ?? record.matchDate),
    summary: asNullableString(record.summary),
    probabilities: {
      home: asNumber(probabilities?.home ?? probabilities?.homeWin) ?? 0,
      draw: asNumber(probabilities?.draw),
      away: asNumber(probabilities?.away ?? probabilities?.awayWin) ?? 0
    },
    expectedScore: {
      home: asNumber(expectedScore?.home),
      away: asNumber(expectedScore?.away)
    },
    heuristicAnalysis: asRecord(record.heuristicAnalysis) ?? asRecord(record.analysis)
  };
};

const normalizeModelPerformancePoint = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("timestamp" in record) {
    return {
      ...record,
      accuracy: asPercent(record.accuracy),
      avgConfidenceScore: asPercent(record.avgConfidenceScore)
    };
  }

  return {
    timestamp: asString(record.timestamp ?? record.date ?? record.updatedAt),
    sportKey: asNullableString(record.sportKey ?? record.sport ?? inferSportKey(record)),
    leagueId: asNullableString(record.leagueId),
    leagueName: asNullableString(record.leagueName),
    modelVersion: asNullableString(record.modelVersion ?? record.modelName ?? record.modelKey),
    accuracy: asPercent(record.accuracy),
    logLoss: asNumber(record.logLoss),
    brierScore: asNumber(record.brierScore),
    avgConfidenceScore: asPercent(record.avgConfidenceScore),
    sampleSize: asNumber(record.sampleSize)
  };
};

const normalizePerformanceDriftSummary = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if (Array.isArray(record.summaries)) {
    return record;
  }

  const recentMetrics = asRecord(asRecord(record.recentWindow)?.metrics);
  const baselineMetrics = asRecord(asRecord(record.baselineWindow)?.metrics);
  const driftValues = asRecord(record.driftValues);

  const makeSummary = (
    metric: string,
    recentKey: string,
    baselineKey: string,
    deltaKey?: string
  ) => ({
    metric,
    recent7d: asPercent(recentMetrics?.[recentKey] ?? recentMetrics?.[metric]),
    previous30d: asPercent(baselineMetrics?.[baselineKey] ?? baselineMetrics?.[metric]),
    delta:
      asNumber(driftValues?.[deltaKey ?? metric]) ??
      ((asPercent(recentMetrics?.[recentKey] ?? recentMetrics?.[metric]) ?? 0) -
        (asPercent(baselineMetrics?.[baselineKey] ?? baselineMetrics?.[metric]) ?? 0)),
    status:
      metric === "accuracy" && Boolean(record.performanceDropDetected)
        ? "warning"
        : metric === "avgConfidenceScore" && Boolean(record.confidenceDriftDetected)
          ? "warning"
          : metric === "calibrationQuality" && Boolean(record.calibrationDriftDetected)
            ? "warning"
            : "stable"
  });

  return {
    performanceDropDetected: Boolean(record.performanceDropDetected),
    confidenceDriftDetected: Boolean(record.confidenceDriftDetected),
    calibrationDriftDetected: Boolean(record.calibrationDriftDetected),
    summaries: [
      makeSummary("accuracy", "accuracy", "accuracy", "accuracyDrop"),
      makeSummary("logLoss", "logLoss", "logLoss"),
      makeSummary("brierScore", "brierScore", "brierScore"),
      makeSummary("avgConfidenceScore", "avgConfidenceScore", "avgConfidenceScore", "confidenceDrift"),
      makeSummary("calibrationQuality", "calibrationQuality", "calibrationQuality", "calibrationDrift")
    ],
    updatedAt: asNullableString(asRecord(record.recentWindow)?.to ?? record.updatedAt)
  };
};

const normalizeModelStrategy = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("sportKey" in record && "primaryModel" in record) {
    return record;
  }

  return {
    id: asString(record.id),
    sportKey: asString(record.sportKey ?? record.sport, inferSportKey(record)),
    leagueId: asNullableString(record.leagueId),
    leagueName: asNullableString(record.leagueName),
    predictionType: asString(record.predictionType, "match-outcome"),
    primaryModel: asString(record.primaryModel ?? record.modelVersion ?? record.modelKey, "-"),
    fallbackModel: asNullableString(record.fallbackModel),
    isActive: Boolean(record.isActive ?? true),
    summary: asRecord(record.summary),
    updatedAt: asNullableString(record.updatedAt)
  };
};

const normalizeEnsembleConfig = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  if ("weights" in record && Array.isArray(record.weights)) {
    return record;
  }

  const weightsSource = Array.isArray(record.weights)
    ? record.weights
    : Object.entries(asRecord(record.modelWeights) ?? {}).map(([model, weight]) => ({ model, weight }));

  return {
    id: asString(record.id),
    sportKey: asString(record.sportKey ?? record.sport, inferSportKey(record)),
    leagueId: asNullableString(record.leagueId),
    leagueName: asNullableString(record.leagueName),
    modelVersion: asNullableString(record.modelVersion ?? record.modelKey),
    weights: weightsSource.map((item) => {
      const weightRecord = asRecord(item);
      return {
        model: asString(weightRecord?.model),
        weight: asNumber(weightRecord?.weight) ?? 0
      };
    }),
    isActive: Boolean(record.isActive ?? true),
    normalizedWeightTotal: asNumber(record.normalizedWeightTotal),
    updatedAt: asNullableString(record.updatedAt)
  };
};

const labelize = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeFeatureLab = (value: unknown): unknown => {
  const record = asRecord(value);
  if (record && Array.isArray(record.featureGroups) && Array.isArray(record.featureSets) && Array.isArray(record.templates)) {
    return record;
  }

  if (!Array.isArray(value)) return value;

  const featureGroups = value.flatMap((entry) => {
    const item = asRecord(entry);
    if (!item) return [];
    const sportKey = asString(item.sportKey ?? item.sport, inferSportKey(item));
    const enabledFeatures = new Set(asStringArray(item.enabledFeatures));
    const groups = asRecord(item.featureGroups) ?? {};

    return Object.entries(groups).map(([groupKey, featureKeys]) => ({
      id: `${asString(item.id)}:${groupKey}`,
      sportKey,
      name: labelize(groupKey),
      description: null,
      isEnabled: true,
      features: asStringArray(featureKeys).map((featureKey) => ({
        key: featureKey,
        label: labelize(featureKey),
        enabled: enabledFeatures.has(featureKey)
      })),
      updatedAt: asNullableString(item.updatedAt)
    }));
  });

  const featureSets = value.flatMap((entry) => {
    const item = asRecord(entry);
    if (!item) return [];
    return [
      {
        id: asString(item.id),
        sportKey: asString(item.sportKey ?? item.sport, inferSportKey(item)),
        name: asString(item.name, "Feature set"),
        template: asNullableString(item.version),
        featureKeys: asStringArray(item.enabledFeatures),
        isActive: Boolean(item.isActive),
        updatedAt: asNullableString(item.updatedAt)
      }
    ];
  });

  const templates = value.flatMap((entry) => {
    const item = asRecord(entry);
    if (!item) return [];
    return [
      {
        id: asString(item.id),
        sportKey: asString(item.sportKey ?? item.sport, inferSportKey(item)),
        label: asString(item.name, "Template"),
        description: asNullableString(item.version ? `Version ${item.version}` : null)
      }
    ];
  });

  return {
    featureGroups,
    featureSets,
    templates,
    activeFeatureSetId: featureSets.find((item) => item.isActive)?.id ?? featureSets[0]?.id ?? null,
    updatedAt: featureSets[0]?.updatedAt ?? null
  };
};

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

export const paginationMetaSchema = z.preprocess((value) => {
  const record = asRecord(value);
  if (!record) return value;

  const page = asNumber(record.page) ?? 1;
  const pageSize = asNumber(record.pageSize) ?? 0;
  const total = asNumber(record.total) ?? 0;
  const totalPages =
    asNumber(record.totalPages) ??
    (pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1);

  return {
    page,
    pageSize,
    total,
    totalPages,
    generatedAt: asNullableString(record.generatedAt) ?? undefined,
    updatedAt: asNullableString(record.updatedAt) ?? undefined
  };
}, z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
  generatedAt: z.string().optional(),
  updatedAt: z.string().optional()
}));

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: paginationMetaSchema.nullable().optional(),
    error: apiErrorSchema.nullable().optional()
  });

export const sportSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable().optional()
});

const leagueListItemBaseSchema = z.object({
  id: z.string(),
  sportId: z.string(),
  sportKey: z.string(),
  name: z.string(),
  country: z.string(),
  season: z.string(),
  logoUrl: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const leagueListItemSchema = z.preprocess(normalizeLeagueListItem, leagueListItemBaseSchema);

export const leagueDetailSchema = z.preprocess(normalizeLeagueListItem, leagueListItemBaseSchema.extend({
  description: z.string().nullable().optional(),
  statsSummary: z
    .object({
      avgScore: z.number().nullable(),
      homeWinRate: z.number().nullable(),
      awayWinRate: z.number().nullable(),
      drawRate: z.number().nullable().optional()
    })
    .optional()
}));

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

export const teamListItemSchema = z.preprocess(normalizeTeamListItem, z.object({
  id: z.string(),
  leagueId: z.string(),
  sportId: z.string(),
  sportKey: z.string(),
  name: z.string(),
  shortName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional()
}));

export const teamDetailSchema = z.preprocess(normalizeTeamDetail, z.object({
  id: z.string(),
  leagueId: z.string(),
  sportId: z.string(),
  sportKey: z.string(),
  name: z.string(),
  shortName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  foundedYear: z.number().nullable().optional(),
  coach: z.string().nullable().optional(),
  homeMetric: z.number().nullable().optional(),
  awayMetric: z.number().nullable().optional(),
  attackMetric: z.number().nullable().optional(),
  defenseMetric: z.number().nullable().optional()
}));

export const teamFormPointSchema = z.object({
  date: z.string(),
  opponent: z.string(),
  result: z.enum(["W", "D", "L"]),
  scoreFor: z.number().nullable().optional(),
  scoreAgainst: z.number().nullable().optional(),
  value: z.number().nullable().optional()
});

export const teamFormListSchema = z.preprocess(normalizeTeamFormList, z.array(teamFormPointSchema));

const matchListItemBaseSchema = z.object({
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

export const matchListItemSchema = z.preprocess(normalizeMatchListItem, matchListItemBaseSchema);

export const matchDetailSchema = z.preprocess(normalizeMatchDetail, matchListItemBaseSchema.extend({
  venue: z.string().nullable().optional(),
  round: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  expectedScoreHome: z.number().nullable().optional(),
  expectedScoreAway: z.number().nullable().optional(),
  riskFlags: z.array(z.string()).nullable().optional(),
  h2hSummary: z.string().nullable().optional()
}));

export const matchEventSchema = z.object({
  id: z.string(),
  minute: z.number().nullable(),
  teamId: z.string().nullable().optional(),
  teamName: z.string().nullable().optional(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable().optional()
});

export const matchStatsSchema = z.preprocess(normalizeMatchStats, z.object({
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
}));

export const matchPredictionSchema = z.preprocess(normalizeMatchPrediction, z.object({
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
}));

const predictionItemBaseSchema = z.object({
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

export const predictionItemSchema = z.preprocess(normalizePredictionItem, predictionItemBaseSchema);

export const calibrationHealthSummarySchema = z.preprocess(normalizeCalibrationHealthSummary, z.object({
  status: z.string().nullable().optional(),
  brierScore: z.number().nullable().optional(),
  ece: z.number().nullable().optional(),
  reliability: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
}).nullable());

export const riskDistributionSummarySchema = z.preprocess(normalizeRiskDistributionSummary, z.object({
  low: z.number(),
  medium: z.number(),
  high: z.number(),
  updatedAt: z.string().nullable().optional()
}));

const dashboardSummaryBaseSchema = z.object({
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

export const dashboardSummarySchema = z.preprocess(normalizeDashboardSummary, dashboardSummaryBaseSchema);

export const guideSummarySchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      text: z.string()
    })
  )
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
});

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  role: z.object({
    name: z.string()
  }).nullable().optional()
}).passthrough();

export const teamSquadPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string().nullable().optional(),
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

export const predictionRiskSummarySchema = z.preprocess(normalizePredictionRiskSummary, z.object({
  totalPredictions: z.number().nullable().optional(),
  low: z.number().nullable().optional(),
  medium: z.number().nullable().optional(),
  high: z.number().nullable().optional(),
  riskFlagsTop: z.array(z.object({ flag: z.string(), count: z.number() })).optional(),
  calibrationHealthSummary: calibrationHealthSummarySchema.nullable().optional(),
  updatedAt: z.string().nullable().optional()
}));

export const comparisonMetricSchema = z.object({
  name: z.string(),
  value: z.number().nullable().optional(),
  delta: z.number().nullable().optional(),
  rating: z.string().nullable().optional()
});

export const modelComparisonItemSchema = z.preprocess(normalizeModelComparisonItem, z.object({
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
}));

export const featureContributionSchema = z.object({
  feature: z.string(),
  score: z.number(),
  direction: z.string().optional(),
  description: z.string().nullable().optional()
});

export const featureImportanceItemSchema = z.preprocess(normalizeFeatureImportanceItem, z.object({
  modelVersion: z.string(),
  sportKey: z.string(),
  updatedAt: z.string().nullable().optional(),
  features: z.array(featureContributionSchema)
}));

const failedPredictionItemBaseSchema = z.object({
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

export const failedPredictionItemSchema = z.preprocess(normalizeFailedPredictionItem, failedPredictionItemBaseSchema);

export const failedPredictionDetailSchema = z.preprocess(normalizeFailedPredictionItem, failedPredictionItemBaseSchema.extend({
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
}));

export const modelPerformancePointSchema = z.preprocess(normalizeModelPerformancePoint, z.object({
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
}));

export const driftSummarySchema = z.object({
  metric: z.string(),
  recent7d: z.number().nullable().optional(),
  previous30d: z.number().nullable().optional(),
  delta: z.number().nullable().optional(),
  status: z.string().nullable().optional()
});

export const performanceDriftSummarySchema = z.preprocess(normalizePerformanceDriftSummary, z.object({
  performanceDropDetected: z.boolean().nullable().optional(),
  confidenceDriftDetected: z.boolean().nullable().optional(),
  calibrationDriftDetected: z.boolean().nullable().optional(),
  summaries: z.array(driftSummarySchema).optional(),
  updatedAt: z.string().nullable().optional()
}));

export const strategySummarySchema = z.object({
  totalStrategies: z.number().nullable().optional(),
  activeStrategies: z.number().nullable().optional(),
  autoSelectedAt: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const modelStrategySchema = z.preprocess(normalizeModelStrategy, z.object({
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
}));

export const ensembleWeightSchema = z.object({
  model: z.string(),
  weight: z.number()
});

export const ensembleConfigSchema = z.preprocess(normalizeEnsembleConfig, z.object({
  id: z.string(),
  sportKey: z.string(),
  leagueId: z.string().nullable().optional(),
  leagueName: z.string().nullable().optional(),
  modelVersion: z.string().nullable().optional(),
  weights: z.array(ensembleWeightSchema),
  isActive: z.boolean().nullable().optional(),
  normalizedWeightTotal: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional()
}));

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

export const featureLabSchema = z.preprocess(normalizeFeatureLab, z.object({
  featureGroups: z.array(featureGroupSchema),
  featureSets: z.array(featureSetSchema),
  templates: z.array(featureLabTemplateSchema),
  activeFeatureSetId: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
}));

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
