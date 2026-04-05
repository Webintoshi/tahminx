import type {
  CalibrationResult,
  CalibrationRunResponse,
  EnsembleConfig,
  FailedPredictionDetail,
  FailedPredictionItem,
  FeatureExperiment,
  FeatureExperimentResult,
  FeatureImportanceItem,
  FeatureLab,
  ModelComparisonItem,
  ModelStrategy,
  ModelPerformancePoint,
  PerformanceDriftSummary,
  StrategySummary,
  DashboardSummary,
  GuideSummary,
  LeagueDetail,
  MatchDetail,
  MatchEvent,
  MatchPrediction,
  MatchStats,
  PredictionItem,
  PredictionRiskSummary,
  Sport,
  StandingRow,
  TeamDetail,
  TeamFormPoint,
  TeamSquadPlayer
} from "@/types/api-contract";

const now = new Date();

const toIso = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const sportsMock: Sport[] = [
  { id: "s-football", key: "football", name: "Futbol" },
  { id: "s-basketball", key: "basketball", name: "Basketbol" }
];

export const leaguesMock: LeagueDetail[] = [
  {
    id: "l-super-lig",
    sportId: "s-football",
    sportKey: "football",
    name: "Super Lig",
    country: "Turkiye",
    season: "2025/26",
    updatedAt: toIso(0, 18, 30),
    statsSummary: { avgScore: 2.78, homeWinRate: 46, awayWinRate: 27, drawRate: 27 }
  },
  {
    id: "l-premier-league",
    sportId: "s-football",
    sportKey: "football",
    name: "Premier League",
    country: "England",
    season: "2025/26",
    updatedAt: toIso(0, 19, 20),
    statsSummary: { avgScore: 2.95, homeWinRate: 48, awayWinRate: 29, drawRate: 23 }
  },
  {
    id: "l-euroleague",
    sportId: "s-basketball",
    sportKey: "basketball",
    name: "EuroLeague",
    country: "Europe",
    season: "2025/26",
    updatedAt: toIso(0, 16, 0),
    statsSummary: { avgScore: 163.4, homeWinRate: 52, awayWinRate: 48 }
  },
  {
    id: "l-nba",
    sportId: "s-basketball",
    sportKey: "basketball",
    name: "NBA",
    country: "USA",
    season: "2025/26",
    updatedAt: toIso(0, 5, 10),
    statsSummary: { avgScore: 227.3, homeWinRate: 55, awayWinRate: 45 }
  }
];

export const standingsMock: Record<string, StandingRow[]> = {
  "l-super-lig": [
    { position: 1, teamId: "t-gs", teamName: "Galatasaray", played: 29, won: 22, drawn: 5, lost: 2, points: 71, goalsFor: 64, goalsAgainst: 24, form: ["W", "W", "D", "W", "W"] },
    { position: 2, teamId: "t-fb", teamName: "Fenerbahce", played: 29, won: 21, drawn: 4, lost: 4, points: 67, goalsFor: 62, goalsAgainst: 28, form: ["W", "D", "W", "W", "L"] },
    { position: 3, teamId: "t-bjk", teamName: "Besiktas", played: 29, won: 17, drawn: 6, lost: 6, points: 57, goalsFor: 48, goalsAgainst: 31, form: ["W", "L", "W", "D", "W"] }
  ],
  "l-premier-league": [
    { position: 1, teamId: "t-liv", teamName: "Liverpool", played: 31, won: 22, drawn: 6, lost: 3, points: 72, goalsFor: 71, goalsAgainst: 31, form: ["W", "W", "W", "D", "W"] },
    { position: 2, teamId: "t-ars", teamName: "Arsenal", played: 31, won: 21, drawn: 7, lost: 3, points: 70, goalsFor: 66, goalsAgainst: 30, form: ["W", "W", "D", "W", "W"] }
  ],
  "l-euroleague": [
    { position: 1, teamId: "t-rm", teamName: "Real Madrid", played: 31, won: 23, drawn: 0, lost: 8, points: 46, form: ["W", "W", "W", "D", "W"] },
    { position: 2, teamId: "t-fbb", teamName: "Fenerbahce Beko", played: 31, won: 21, drawn: 0, lost: 10, points: 42, form: ["W", "W", "L", "W", "W"] }
  ],
  "l-nba": [
    { position: 1, teamId: "t-bos", teamName: "Boston Celtics", played: 72, won: 52, drawn: 0, lost: 20, points: 104, form: ["W", "W", "W", "L", "W"] },
    { position: 2, teamId: "t-mil", teamName: "Milwaukee Bucks", played: 72, won: 49, drawn: 0, lost: 23, points: 98, form: ["W", "L", "W", "W", "W"] }
  ]
};

export const teamsMock: TeamDetail[] = [
  { id: "t-gs", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football", name: "Galatasaray", shortName: "GS", city: "Istanbul", country: "Turkiye", foundedYear: 1905, coach: "Okan Buruk", homeMetric: 84, awayMetric: 74, attackMetric: 82, defenseMetric: 75 },
  { id: "t-fb", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football", name: "Fenerbahce", shortName: "FB", city: "Istanbul", country: "Turkiye", foundedYear: 1907, coach: "Ismail Kartal", homeMetric: 79, awayMetric: 80, attackMetric: 80, defenseMetric: 76 },
  { id: "t-bjk", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football", name: "Besiktas", shortName: "BJK", city: "Istanbul", country: "Turkiye", foundedYear: 1903, coach: "Fernando Santos", homeMetric: 76, awayMetric: 70, attackMetric: 75, defenseMetric: 70 },
  { id: "t-liv", leagueId: "l-premier-league", sportId: "s-football", sportKey: "football", name: "Liverpool", shortName: "LIV", city: "Liverpool", country: "England", foundedYear: 1892, coach: "Arne Slot", homeMetric: 86, awayMetric: 77, attackMetric: 87, defenseMetric: 73 },
  { id: "t-ars", leagueId: "l-premier-league", sportId: "s-football", sportKey: "football", name: "Arsenal", shortName: "ARS", city: "London", country: "England", foundedYear: 1886, coach: "Mikel Arteta", homeMetric: 82, awayMetric: 78, attackMetric: 84, defenseMetric: 75 },
  { id: "t-fbb", leagueId: "l-euroleague", sportId: "s-basketball", sportKey: "basketball", name: "Fenerbahce Beko", shortName: "FBB", city: "Istanbul", country: "Turkiye", foundedYear: 1913, coach: "Sarunas Jasikevicius", homeMetric: 82, awayMetric: 73, attackMetric: 85, defenseMetric: 77 },
  { id: "t-rm", leagueId: "l-euroleague", sportId: "s-basketball", sportKey: "basketball", name: "Real Madrid", shortName: "RMD", city: "Madrid", country: "Spain", foundedYear: 1931, coach: "Chus Mateo", homeMetric: 85, awayMetric: 80, attackMetric: 88, defenseMetric: 79 },
  { id: "t-bos", leagueId: "l-nba", sportId: "s-basketball", sportKey: "basketball", name: "Boston Celtics", shortName: "BOS", city: "Boston", country: "USA", foundedYear: 1946, coach: "Joe Mazzulla", homeMetric: 89, awayMetric: 79, attackMetric: 90, defenseMetric: 81 },
  { id: "t-mil", leagueId: "l-nba", sportId: "s-basketball", sportKey: "basketball", name: "Milwaukee Bucks", shortName: "MIL", city: "Milwaukee", country: "USA", foundedYear: 1968, coach: "Doc Rivers", homeMetric: 84, awayMetric: 76, attackMetric: 89, defenseMetric: 78 }
];

export const teamFormMock: Record<string, TeamFormPoint[]> = {
  "t-gs": [
    { date: toIso(-10, 21), opponent: "Besiktas", result: "W", scoreFor: 2, scoreAgainst: 1, value: 82 },
    { date: toIso(-7, 20), opponent: "Trabzonspor", result: "W", scoreFor: 1, scoreAgainst: 0, value: 85 },
    { date: toIso(-5, 20), opponent: "Basaksehir", result: "D", scoreFor: 1, scoreAgainst: 1, value: 70 },
    { date: toIso(-3, 20), opponent: "Adana Demir", result: "W", scoreFor: 3, scoreAgainst: 1, value: 88 },
    { date: toIso(-1, 20), opponent: "Kayserispor", result: "W", scoreFor: 2, scoreAgainst: 0, value: 86 }
  ],
  "t-fb": [
    { date: toIso(-10, 21), opponent: "Antalyaspor", result: "W", scoreFor: 3, scoreAgainst: 0, value: 84 },
    { date: toIso(-8, 20), opponent: "Konyaspor", result: "D", scoreFor: 1, scoreAgainst: 1, value: 68 },
    { date: toIso(-6, 20), opponent: "Rizespor", result: "W", scoreFor: 2, scoreAgainst: 0, value: 82 },
    { date: toIso(-4, 20), opponent: "Alanyaspor", result: "W", scoreFor: 2, scoreAgainst: 1, value: 80 },
    { date: toIso(-1, 21), opponent: "Sivasspor", result: "L", scoreFor: 0, scoreAgainst: 1, value: 45 }
  ]
};

export const teamSquadMock: Record<string, TeamSquadPlayer[]> = {
  "t-gs": [
    { id: "p1", name: "Fernando Muslera", position: "GK", number: 1 },
    { id: "p2", name: "Abdulkerim Bardakci", position: "CB", number: 42 },
    { id: "p3", name: "Lucas Torreira", position: "DM", number: 34 },
    { id: "p4", name: "Dries Mertens", position: "AM", number: 10 },
    { id: "p5", name: "Mauro Icardi", position: "ST", number: 9 }
  ],
  "t-fb": [
    { id: "p6", name: "Dominik Livakovic", position: "GK", number: 40 },
    { id: "p7", name: "Djiku", position: "CB", number: 6 },
    { id: "p8", name: "Fred", position: "CM", number: 35 },
    { id: "p9", name: "Szymanski", position: "AM", number: 53 },
    { id: "p10", name: "Dzeko", position: "ST", number: 9 }
  ]
};

export const matchesMock: MatchDetail[] = [
  {
    id: "m1",
    sportKey: "football",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    homeTeamId: "t-gs",
    awayTeamId: "t-fb",
    homeTeamName: "Galatasaray",
    awayTeamName: "Fenerbahce",
    kickoffAt: toIso(0, 20),
    status: "scheduled",
    scoreHome: null,
    scoreAway: null,
    confidenceScore: 79,
    venue: "Rams Park",
    round: "Hafta 30",
    summary: "Derby with high tactical variability.",
    expectedScoreHome: 1.7,
    expectedScoreAway: 1.3,
    riskFlags: ["Derby volatility", "Card risk"],
    h2hSummary: "Last five meetings are tightly balanced."
  },
  {
    id: "m2",
    sportKey: "football",
    leagueId: "l-premier-league",
    leagueName: "Premier League",
    homeTeamId: "t-liv",
    awayTeamId: "t-ars",
    homeTeamName: "Liverpool",
    awayTeamName: "Arsenal",
    kickoffAt: toIso(0, 22),
    status: "live",
    scoreHome: 2,
    scoreAway: 1,
    confidenceScore: 81,
    venue: "Anfield",
    round: "Matchday 32",
    expectedScoreHome: 2.1,
    expectedScoreAway: 1.4,
    riskFlags: ["Late pressure phase"],
    h2hSummary: "Home side has slight edge in high-intensity phases."
  },
  {
    id: "m3",
    sportKey: "football",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    homeTeamId: "t-bjk",
    awayTeamId: "t-gs",
    homeTeamName: "Besiktas",
    awayTeamName: "Galatasaray",
    kickoffAt: toIso(-1, 20),
    status: "completed",
    scoreHome: 1,
    scoreAway: 2,
    confidenceScore: 72,
    venue: "Tupras Stadium",
    round: "Hafta 29",
    expectedScoreHome: 1.1,
    expectedScoreAway: 1.6,
    riskFlags: ["Set-piece variance"]
  },
  {
    id: "m4",
    sportKey: "basketball",
    leagueId: "l-euroleague",
    leagueName: "EuroLeague",
    homeTeamId: "t-fbb",
    awayTeamId: "t-rm",
    homeTeamName: "Fenerbahce Beko",
    awayTeamName: "Real Madrid",
    kickoffAt: toIso(0, 21, 30),
    status: "scheduled",
    scoreHome: null,
    scoreAway: null,
    confidenceScore: 64,
    venue: "Ulker Sports Arena",
    round: "Round 32",
    expectedScoreHome: 84,
    expectedScoreAway: 82,
    riskFlags: ["Three-point variance"]
  },
  {
    id: "m5",
    sportKey: "basketball",
    leagueId: "l-nba",
    leagueName: "NBA",
    homeTeamId: "t-bos",
    awayTeamId: "t-mil",
    homeTeamName: "Boston Celtics",
    awayTeamName: "Milwaukee Bucks",
    kickoffAt: toIso(0, 4, 0),
    status: "live",
    scoreHome: 74,
    scoreAway: 70,
    confidenceScore: 58,
    venue: "TD Garden",
    round: "Regular Season",
    expectedScoreHome: 116,
    expectedScoreAway: 111,
    riskFlags: ["Foul trouble"]
  },
  {
    id: "m6",
    sportKey: "basketball",
    leagueId: "l-nba",
    leagueName: "NBA",
    homeTeamId: "t-mil",
    awayTeamId: "t-bos",
    homeTeamName: "Milwaukee Bucks",
    awayTeamName: "Boston Celtics",
    kickoffAt: toIso(-1, 3, 30),
    status: "completed",
    scoreHome: 108,
    scoreAway: 112,
    confidenceScore: 75,
    venue: "Fiserv Forum",
    round: "Regular Season",
    expectedScoreHome: 110,
    expectedScoreAway: 114,
    riskFlags: ["Bench variance"]
  },
  {
    id: "m7",
    sportKey: "football",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    homeTeamId: "t-fb",
    awayTeamId: "t-bjk",
    homeTeamName: "Fenerbahce",
    awayTeamName: "Besiktas",
    kickoffAt: toIso(1, 20),
    status: "scheduled",
    scoreHome: null,
    scoreAway: null,
    confidenceScore: 68,
    venue: "Ulker Stadyumu",
    expectedScoreHome: 1.5,
    expectedScoreAway: 1.1,
    riskFlags: ["Injury uncertainty"]
  }
];

export const matchEventsMock: Record<string, MatchEvent[]> = {
  m1: [],
  m2: [
    { id: "e1", minute: 11, teamId: "t-liv", teamName: "Liverpool", type: "goal", title: "Goal", description: "Inside-box finish after quick transition" },
    { id: "e2", minute: 29, teamId: "t-ars", teamName: "Arsenal", type: "goal", title: "Goal", description: "Set-piece equalizer" },
    { id: "e3", minute: 54, teamId: "t-liv", teamName: "Liverpool", type: "goal", title: "Goal", description: "Back-post header" },
    { id: "e4", minute: 70, teamId: "t-ars", teamName: "Arsenal", type: "card", title: "Yellow Card", description: "Tactical foul" }
  ],
  m4: [],
  m5: [
    { id: "e5", minute: 8, teamId: "t-bos", teamName: "Boston Celtics", type: "run", title: "Run", description: "7-0 scoring run" },
    { id: "e6", minute: 24, teamId: "t-bos", teamName: "Boston Celtics", type: "highlight", title: "Highlight", description: "Transition dunk" }
  ]
};

export const matchStatsMock: Record<string, MatchStats> = {
  m1: { possessionHome: 58, possessionAway: 42, shotsHome: 14, shotsAway: 11, shotsOnTargetHome: 5, shotsOnTargetAway: 4, xgHome: 1.7, xgAway: 1.3 },
  m2: { possessionHome: 61, possessionAway: 39, shotsHome: 12, shotsAway: 8, shotsOnTargetHome: 6, shotsOnTargetAway: 4, xgHome: 2.1, xgAway: 1.4 },
  m4: { paceHome: 73, paceAway: 71, efficiencyHome: 1.12, efficiencyAway: 1.15 },
  m5: { paceHome: 99, paceAway: 101, efficiencyHome: 1.18, efficiencyAway: 1.16 }
};

export const matchPredictionMock: Record<string, MatchPrediction> = {
  m1: {
    matchId: "m1",
    expectedScore: { home: 1.7, away: 1.3 },
    probabilities: { home: 44, draw: 27, away: 29 },
    confidenceScore: 79,
    riskFlags: ["Derby volatility", "Card risk"],
    modelExplanation: "Home pressing intensity and final-third control are above league baseline.",
    summary: "Model home edge with moderate uncertainty.",
    isLowConfidence: false,
    isRecommended: true
  },
  m2: {
    matchId: "m2",
    expectedScore: { home: 2.1, away: 1.4 },
    probabilities: { home: 52, draw: 23, away: 25 },
    confidenceScore: 81,
    riskFlags: ["Late pressure phase"],
    modelExplanation: "Sequence-based momentum favors home side after minute 60.",
    summary: "High confidence output under live pressure conditions.",
    isLowConfidence: false,
    isRecommended: true
  },
  m4: {
    matchId: "m4",
    expectedScore: { home: 84, away: 82 },
    probabilities: { home: 49, away: 51 },
    confidenceScore: 64,
    riskFlags: ["Three-point variance"],
    modelExplanation: "Second unit defense mismatch creates narrow edge scenario.",
    summary: "Near coin-flip scenario with elevated variance.",
    isLowConfidence: true,
    isRecommended: false
  },
  m5: {
    matchId: "m5",
    expectedScore: { home: 116, away: 111 },
    probabilities: { home: 57, away: 43 },
    confidenceScore: 58,
    riskFlags: ["Foul trouble"],
    modelExplanation: "Half-court efficiency trend supports home-side closeout.",
    summary: "Live-state sample instability lowered calibration confidence.",
    isLowConfidence: true,
    isRecommended: false
  }
};

export const predictionsMock: PredictionItem[] = matchesMock.map((match, index) => {
  const prediction = matchPredictionMock[match.id] ?? {
    matchId: match.id,
    expectedScore: { home: match.expectedScoreHome ?? null, away: match.expectedScoreAway ?? null },
    probabilities: { home: 45, draw: match.sportKey === "football" ? 25 : undefined, away: 30 },
    confidenceScore: match.confidenceScore ?? 60,
    riskFlags: match.riskFlags ?? [],
    modelExplanation: "Baseline probabilistic model output.",
    summary: "Baseline summary.",
    isLowConfidence: (match.confidenceScore ?? 0) < 67,
    isRecommended: (match.confidenceScore ?? 0) >= 76
  };

  const confidence = prediction.confidenceScore ?? 0;

  return {
    id: `pred-${index + 1}`,
    matchId: match.id,
    sportKey: match.sportKey,
    leagueId: match.leagueId,
    leagueName: match.leagueName,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    kickoffAt: match.kickoffAt,
    confidenceScore: confidence,
    riskLevel: confidence >= 78 ? "low" : confidence >= 68 ? "medium" : "high",
    expectedScore: prediction.expectedScore,
    probabilities: prediction.probabilities,
    modelSummary: prediction.summary ?? prediction.modelExplanation ?? "Model summary yok.",
    riskFlags: prediction.riskFlags ?? [],
    isLowConfidence: prediction.isLowConfidence ?? confidence < 67,
    isRecommended: prediction.isRecommended ?? confidence >= 76
  };
});

const lowCount = predictionsMock.filter((item) => item.riskLevel === "low").length;
const mediumCount = predictionsMock.filter((item) => item.riskLevel === "medium").length;
const highCount = predictionsMock.filter((item) => item.riskLevel === "high").length;
const lowConfidenceCount = predictionsMock.filter((item) => item.isLowConfidence).length;

export const dashboardMock: DashboardSummary = {
  todayMatchCount: matchesMock.filter((item) => new Date(item.kickoffAt).toDateString() === now.toDateString()).length,
  liveMatchCount: matchesMock.filter((item) => item.status === "live").length,
  highConfidencePredictionCount: predictionsMock.filter((item) => (item.confidenceScore ?? 0) >= 78).length,
  updatedLeagues: leaguesMock.slice(0, 3),
  highConfidencePredictions: predictionsMock.filter((item) => (item.confidenceScore ?? 0) >= 78).slice(0, 5),
  recentPredictions: predictionsMock.slice(0, 6),
  todayMatches: matchesMock.filter((item) => new Date(item.kickoffAt).toDateString() === now.toDateString()).slice(0, 6),
  miniTrends: [
    { label: "Galatasaray", values: [68, 72, 76, 79, 82] },
    { label: "Liverpool", values: [70, 73, 75, 80, 84] },
    { label: "Celtics", values: [66, 71, 74, 79, 83] }
  ],
  calibratedHighConfidenceCount: predictionsMock.filter((item) => (item.confidenceScore ?? 0) >= 80).length,
  lowConfidenceCount,
  avgConfidenceScore: Number(
    (predictionsMock.reduce((sum, current) => sum + (current.confidenceScore ?? 0), 0) / Math.max(1, predictionsMock.length)).toFixed(1)
  ),
  riskDistribution: {
    low: lowCount,
    medium: mediumCount,
    high: highCount,
    updatedAt: toIso(0, 23, 10)
  },
  calibrationHealthSummary: {
    status: "monitoring",
    brierScore: 0.18,
    ece: 0.06,
    reliability: 0.82,
    note: "Calibration stable; monitor medium-risk band.",
    updatedAt: toIso(0, 23, 10)
  }
};

export const guideSummaryMock: GuideSummary = {
  title: "TahminX Rehber Ozeti",
  sections: [
    { heading: "Sistem nasil calisir", text: "Veri katmani, modelleme katmani ve aciklanabilirlik birlikte calisir." },
    { heading: "Guven skoru", text: "Guven skoru, veri kalitesi ve belirsizlik ile birlikte okunmalidir." },
    { heading: "Toplam skor analizi", text: "Toplam skor senaryolari tempo ve verimlilik baglaminda yorumlanir." }
  ]
};

export const calibrationResultsMock: CalibrationResult[] = [
  {
    id: "cal-2026-04-05-01",
    startedAt: toIso(0, 1, 0),
    finishedAt: toIso(0, 1, 8),
    sampleSize: 420,
    brierScore: 0.19,
    ece: 0.07,
    reliability: 0.81,
    status: "completed",
    note: "Stable distribution across football segment.",
    updatedAt: toIso(0, 1, 8)
  },
  {
    id: "cal-2026-04-04-01",
    startedAt: toIso(-1, 1, 0),
    finishedAt: toIso(-1, 1, 9),
    sampleSize: 410,
    brierScore: 0.2,
    ece: 0.08,
    reliability: 0.79,
    status: "completed",
    note: "Basketball variance slightly elevated.",
    updatedAt: toIso(-1, 1, 9)
  }
];

export const calibrationRunMock: CalibrationRunResponse = {
  runId: "cal-run-pending-01",
  startedAt: toIso(0, 2, 0),
  message: "Calibration run started.",
  status: "running",
  updatedAt: toIso(0, 2, 0)
};

export const predictionRiskSummaryMock: PredictionRiskSummary = {
  totalPredictions: predictionsMock.length,
  low: lowCount,
  medium: mediumCount,
  high: highCount,
  riskFlagsTop: [
    { flag: "Derby volatility", count: 2 },
    { flag: "Foul trouble", count: 2 },
    { flag: "Three-point variance", count: 1 }
  ],
  calibrationHealthSummary: dashboardMock.calibrationHealthSummary ?? null,
  updatedAt: toIso(0, 23, 10)
};

export const modelComparisonMock: ModelComparisonItem[] = [
  {
    modelVersion: "v2.7.1",
    sportKey: "football",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    accuracy: 74.8,
    logLoss: 0.89,
    brierScore: 0.2,
    avgConfidenceScore: 71.6,
    calibrationQuality: 83.2,
    sampleSize: 642,
    metrics: [
      { name: "accuracy", value: 74.8, delta: 1.4, rating: "stable" },
      { name: "logLoss", value: 0.89, delta: -0.03, rating: "improving" },
      { name: "brierScore", value: 0.2, delta: -0.01, rating: "improving" }
    ],
    updatedAt: toIso(0, 22, 10)
  },
  {
    modelVersion: "v2.7.1",
    sportKey: "basketball",
    leagueId: "l-nba",
    leagueName: "NBA",
    accuracy: 72.3,
    logLoss: 0.94,
    brierScore: 0.22,
    avgConfidenceScore: 69.1,
    calibrationQuality: 80.4,
    sampleSize: 715,
    metrics: [
      { name: "accuracy", value: 72.3, delta: 0.5, rating: "stable" },
      { name: "logLoss", value: 0.94, delta: 0.01, rating: "watch" },
      { name: "brierScore", value: 0.22, delta: 0.01, rating: "watch" }
    ],
    updatedAt: toIso(0, 22, 14)
  },
  {
    modelVersion: "v2.6.9",
    sportKey: "football",
    leagueId: "l-premier-league",
    leagueName: "Premier League",
    accuracy: 73.1,
    logLoss: 0.93,
    brierScore: 0.21,
    avgConfidenceScore: 70.2,
    calibrationQuality: 79.6,
    sampleSize: 608,
    metrics: [
      { name: "accuracy", value: 73.1, delta: -0.7, rating: "watch" },
      { name: "logLoss", value: 0.93, delta: 0.02, rating: "watch" },
      { name: "brierScore", value: 0.21, delta: 0.01, rating: "watch" }
    ],
    updatedAt: toIso(-1, 22, 0)
  }
];

export const featureImportanceMock: FeatureImportanceItem[] = [
  {
    modelVersion: "v2.7.1",
    sportKey: "football",
    updatedAt: toIso(0, 20, 0),
    features: [
      { feature: "recentFormDelta", score: 0.24, direction: "positive", description: "Son 5 mac form farki" },
      { feature: "homeAwaySplit", score: 0.18, direction: "positive", description: "Ic saha/dis saha performans etkisi" },
      { feature: "lineupStability", score: 0.15, direction: "positive", description: "Kadro devamliligi" },
      { feature: "injuryAbsences", score: 0.12, direction: "negative", description: "Eksik oyuncu etkisi" },
      { feature: "setPieceVariance", score: 0.09, direction: "neutral", description: "Duran top varyansi" }
    ]
  },
  {
    modelVersion: "v2.7.1",
    sportKey: "basketball",
    updatedAt: toIso(0, 20, 10),
    features: [
      { feature: "paceMismatch", score: 0.22, direction: "positive", description: "Tempo uyumsuzlugu etkisi" },
      { feature: "threePointVolume", score: 0.2, direction: "positive", description: "Uc sayi hacmi etkisi" },
      { feature: "benchNetRating", score: 0.16, direction: "positive", description: "Bench net rating katkisi" },
      { feature: "foulRateRisk", score: 0.14, direction: "negative", description: "Faul riski etkisi" },
      { feature: "backToBackFatigue", score: 0.1, direction: "negative", description: "Yorgunluk etkisi" }
    ]
  },
  {
    modelVersion: "v2.6.9",
    sportKey: "football",
    updatedAt: toIso(-1, 19, 30),
    features: [
      { feature: "xgTrend", score: 0.21, direction: "positive", description: "xG trend katkisii" },
      { feature: "transitionDefense", score: 0.17, direction: "negative", description: "Gecis savunmasi zayifligi" },
      { feature: "pressResistance", score: 0.13, direction: "positive", description: "Pres kirma kalitesi" },
      { feature: "cardRisk", score: 0.1, direction: "negative", description: "Kart riski etkisi" }
    ]
  }
];

export const failedPredictionsMock: FailedPredictionItem[] = [
  {
    id: "fp-001",
    matchId: "m3",
    matchLabel: "Besiktas vs Galatasaray",
    sportKey: "football",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    modelVersion: "v2.7.1",
    predictedResult: "Away Win",
    actualResult: "Draw",
    confidenceScore: 82,
    riskFlags: ["Set-piece variance", "Derby volatility"],
    failureReasonSummary: "Set-piece variance expected edge'i dengeledi.",
    updatedAt: toIso(-1, 23, 10)
  },
  {
    id: "fp-002",
    matchId: "m6",
    matchLabel: "Milwaukee Bucks vs Boston Celtics",
    sportKey: "basketball",
    leagueId: "l-nba",
    leagueName: "NBA",
    modelVersion: "v2.7.1",
    predictedResult: "Home Win",
    actualResult: "Away Win",
    confidenceScore: 78,
    riskFlags: ["Bench variance", "Foul trouble"],
    failureReasonSummary: "Ucuncu ceyrek bench performansi model beklentisini bozdu.",
    updatedAt: toIso(-1, 4, 30)
  },
  {
    id: "fp-003",
    matchId: "m4",
    matchLabel: "Fenerbahce Beko vs Real Madrid",
    sportKey: "basketball",
    leagueId: "l-euroleague",
    leagueName: "EuroLeague",
    modelVersion: "v2.6.9",
    predictedResult: "Under 167.5",
    actualResult: "Over 167.5",
    confidenceScore: 66,
    riskFlags: ["Three-point variance"],
    failureReasonSummary: "Yuksek pace fazi nedeniyle toplam skor yukari sapti.",
    updatedAt: toIso(-2, 21, 40)
  }
];

export const failedPredictionDetailsMock: Record<string, FailedPredictionDetail> = {
  "fp-001": {
    ...failedPredictionsMock[0],
    summary: "Derby macinda gecis fazlari tahminden daha hizli oynandi.",
    probabilities: { home: 24, draw: 28, away: 48 },
    expectedScore: { home: 1.1, away: 1.5 },
    heuristicAnalysis: {
      missingDataImpact: "Yok.",
      staleStatsImpact: "Son iki mac xG sapmasi modele gec yansidi.",
      modelDisagreementImpact: "Ikincil model draw olasiligini daha yuksek vermisti.",
      upsetScenario: "Erken duran top golu dengeyi bozdu.",
      weakMappingConfidence: "Orta seviye.",
      injuryUncertainty: "Mac oncesi son dakika eksigi etkili oldu."
    }
  },
  "fp-002": {
    ...failedPredictionsMock[1],
    summary: "Ucuncu ceyrek rotasyon verimsizligi nedeniyle ev sahibi avantaj kaybetti.",
    probabilities: { home: 56, away: 44 },
    expectedScore: { home: 112, away: 109 },
    heuristicAnalysis: {
      missingDataImpact: "Yok.",
      staleStatsImpact: "B2B etkisi son 48 saat verisinde gecikti.",
      modelDisagreementImpact: "Pace modeli away lehine sinyal uretmisti.",
      upsetScenario: "Clutch fazinda uc sayilik isabet orani artti.",
      weakMappingConfidence: "Dusuk etki.",
      injuryUncertainty: "Kisitli sure alan oyuncu rotasyonu etkiledi."
    }
  },
  "fp-003": {
    ...failedPredictionsMock[2],
    summary: "Beklenenden yuksek tempoda oynanan ikinci yari toplam skoru artirdi.",
    probabilities: { home: 49, away: 51 },
    expectedScore: { home: 82, away: 84 },
    heuristicAnalysis: {
      missingDataImpact: "Kismi pace verisi eksikti.",
      staleStatsImpact: "Son iki mac ritim degisimi modele tam yansimadi.",
      modelDisagreementImpact: "Verimlilik modeli over senaryosunu destekliyordu.",
      upsetScenario: "Son ceyrek tempo kirilimi olustu.",
      weakMappingConfidence: "Orta.",
      injuryUncertainty: "Onemsiz."
    }
  }
};

export const modelPerformanceTimeseriesMock: ModelPerformancePoint[] = [
  { timestamp: toIso(-6, 12), sportKey: "football", leagueId: "l-super-lig", leagueName: "Super Lig", modelVersion: "v2.7.1", accuracy: 73.1, logLoss: 0.93, brierScore: 0.22, avgConfidenceScore: 69.9, sampleSize: 82 },
  { timestamp: toIso(-5, 12), sportKey: "football", leagueId: "l-super-lig", leagueName: "Super Lig", modelVersion: "v2.7.1", accuracy: 74.2, logLoss: 0.91, brierScore: 0.21, avgConfidenceScore: 70.6, sampleSize: 86 },
  { timestamp: toIso(-4, 12), sportKey: "football", leagueId: "l-super-lig", leagueName: "Super Lig", modelVersion: "v2.7.1", accuracy: 74.8, logLoss: 0.9, brierScore: 0.2, avgConfidenceScore: 71.2, sampleSize: 90 },
  { timestamp: toIso(-3, 12), sportKey: "basketball", leagueId: "l-nba", leagueName: "NBA", modelVersion: "v2.7.1", accuracy: 71.5, logLoss: 0.95, brierScore: 0.23, avgConfidenceScore: 68.3, sampleSize: 102 },
  { timestamp: toIso(-2, 12), sportKey: "basketball", leagueId: "l-nba", leagueName: "NBA", modelVersion: "v2.7.1", accuracy: 72.1, logLoss: 0.94, brierScore: 0.22, avgConfidenceScore: 68.8, sampleSize: 108 },
  { timestamp: toIso(-1, 12), sportKey: "basketball", leagueId: "l-nba", leagueName: "NBA", modelVersion: "v2.7.1", accuracy: 72.3, logLoss: 0.94, brierScore: 0.22, avgConfidenceScore: 69.1, sampleSize: 112 },
  { timestamp: toIso(0, 12), sportKey: "football", leagueId: "l-premier-league", leagueName: "Premier League", modelVersion: "v2.6.9", accuracy: 73.1, logLoss: 0.93, brierScore: 0.21, avgConfidenceScore: 70.2, sampleSize: 98 }
];

export const modelDriftSummaryMock: PerformanceDriftSummary = {
  performanceDropDetected: true,
  confidenceDriftDetected: false,
  calibrationDriftDetected: true,
  summaries: [
    { metric: "accuracy", recent7d: 72.9, previous30d: 74.1, delta: -1.2, status: "watch" },
    { metric: "logLoss", recent7d: 0.93, previous30d: 0.9, delta: 0.03, status: "watch" },
    { metric: "brierScore", recent7d: 0.22, previous30d: 0.2, delta: 0.02, status: "watch" },
    { metric: "avgConfidenceScore", recent7d: 69.8, previous30d: 70.3, delta: -0.5, status: "stable" },
    { metric: "calibrationQuality", recent7d: 80.1, previous30d: 82.8, delta: -2.7, status: "watch" }
  ],
  updatedAt: toIso(0, 23, 30)
};

export const strategySummaryMock: StrategySummary = {
  totalStrategies: 6,
  activeStrategies: 4,
  autoSelectedAt: toIso(0, 11, 15),
  note: "Auto-select son 30 gun performansina gore guncellendi.",
  updatedAt: toIso(0, 11, 15)
};

export const modelStrategiesMock: ModelStrategy[] = [
  {
    id: "strategy-1",
    sportKey: "football",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    predictionType: "match-winner",
    primaryModel: "logistic-v2.7.1",
    fallbackModel: "poisson-v2.6.9",
    isActive: true,
    summary: strategySummaryMock,
    updatedAt: toIso(0, 10, 20)
  },
  {
    id: "strategy-2",
    sportKey: "football",
    leagueId: "l-premier-league",
    leagueName: "Premier League",
    predictionType: "goal-expectation",
    primaryModel: "xg-sequence-v2.7.1",
    fallbackModel: "elo-v2.5.3",
    isActive: true,
    summary: strategySummaryMock,
    updatedAt: toIso(0, 10, 30)
  },
  {
    id: "strategy-3",
    sportKey: "basketball",
    leagueId: "l-nba",
    leagueName: "NBA",
    predictionType: "total-score",
    primaryModel: "tempo-logistic-v2.7.1",
    fallbackModel: "teamRating-v2.6.2",
    isActive: true,
    summary: strategySummaryMock,
    updatedAt: toIso(0, 9, 40)
  },
  {
    id: "strategy-4",
    sportKey: "basketball",
    leagueId: "l-euroleague",
    leagueName: "EuroLeague",
    predictionType: "handicap-analysis",
    primaryModel: "elo-v2.6.1",
    fallbackModel: "poisson-v2.5.8",
    isActive: false,
    summary: strategySummaryMock,
    updatedAt: toIso(-1, 22, 35)
  }
];

export const ensembleConfigsMock: EnsembleConfig[] = [
  {
    id: "ens-1",
    sportKey: "football",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    modelVersion: "v2.7.1",
    isActive: true,
    weights: [
      { model: "elo", weight: 0.24 },
      { model: "poisson", weight: 0.26 },
      { model: "logistic", weight: 0.28 },
      { model: "teamRating", weight: 0.22 }
    ],
    normalizedWeightTotal: 1,
    updatedAt: toIso(0, 9, 10)
  },
  {
    id: "ens-2",
    sportKey: "basketball",
    leagueId: "l-nba",
    leagueName: "NBA",
    modelVersion: "v2.7.1",
    isActive: true,
    weights: [
      { model: "elo", weight: 0.2 },
      { model: "poisson", weight: 0.15 },
      { model: "logistic", weight: 0.35 },
      { model: "teamRating", weight: 0.3 }
    ],
    normalizedWeightTotal: 1,
    updatedAt: toIso(0, 9, 30)
  }
];

export const featureLabMock: FeatureLab = {
  templates: [
    { id: "tpl-football-core", sportKey: "football", label: "Football Core", description: "Form + xG + lineup baseline" },
    { id: "tpl-football-variance", sportKey: "football", label: "Football Variance", description: "High variance and derby-aware setup" },
    { id: "tpl-basketball-core", sportKey: "basketball", label: "Basketball Core", description: "Pace + efficiency baseline" },
    { id: "tpl-basketball-fatigue", sportKey: "basketball", label: "Basketball Fatigue", description: "Back-to-back and rotation risk focused" }
  ],
  featureGroups: [
    {
      id: "fg-football-form",
      sportKey: "football",
      name: "Form Signals",
      description: "Takim form trendlerini olcer",
      isEnabled: true,
      features: [
        { key: "recentFormDelta", label: "Recent Form Delta", enabled: true },
        { key: "homeAwaySplit", label: "Home/Away Split", enabled: true },
        { key: "lineupStability", label: "Lineup Stability", enabled: true }
      ],
      updatedAt: toIso(0, 8, 10)
    },
    {
      id: "fg-football-risk",
      sportKey: "football",
      name: "Risk Inputs",
      description: "Belirsizlik ve risk bayraklari",
      isEnabled: true,
      features: [
        { key: "injuryAbsences", label: "Injury Absences", enabled: true },
        { key: "cardRisk", label: "Card Risk", enabled: true },
        { key: "derbyVolatility", label: "Derby Volatility", enabled: false }
      ],
      updatedAt: toIso(0, 8, 20)
    },
    {
      id: "fg-basketball-tempo",
      sportKey: "basketball",
      name: "Tempo Inputs",
      description: "Toplam skor ve tempo etkisi",
      isEnabled: true,
      features: [
        { key: "paceMismatch", label: "Pace Mismatch", enabled: true },
        { key: "threePointVolume", label: "Three Point Volume", enabled: true },
        { key: "foulRateRisk", label: "Foul Rate Risk", enabled: true }
      ],
      updatedAt: toIso(0, 8, 25)
    },
    {
      id: "fg-basketball-fatigue",
      sportKey: "basketball",
      name: "Fatigue Inputs",
      description: "Yorgunluk ve rotasyon etkisi",
      isEnabled: false,
      features: [
        { key: "backToBackFatigue", label: "Back-to-Back Fatigue", enabled: false },
        { key: "benchNetRating", label: "Bench Net Rating", enabled: true },
        { key: "travelLoad", label: "Travel Load", enabled: false }
      ],
      updatedAt: toIso(-1, 23, 45)
    }
  ],
  featureSets: [
    {
      id: "fs-football-core",
      sportKey: "football",
      name: "Football Core v1",
      template: "tpl-football-core",
      featureKeys: ["recentFormDelta", "homeAwaySplit", "lineupStability", "injuryAbsences"],
      isActive: true,
      updatedAt: toIso(0, 7, 50)
    },
    {
      id: "fs-football-variance",
      sportKey: "football",
      name: "Football Variance v2",
      template: "tpl-football-variance",
      featureKeys: ["recentFormDelta", "cardRisk", "derbyVolatility", "injuryAbsences"],
      isActive: false,
      updatedAt: toIso(-1, 21, 20)
    },
    {
      id: "fs-basketball-core",
      sportKey: "basketball",
      name: "Basketball Core v1",
      template: "tpl-basketball-core",
      featureKeys: ["paceMismatch", "threePointVolume", "benchNetRating"],
      isActive: true,
      updatedAt: toIso(0, 7, 55)
    }
  ],
  activeFeatureSetId: "fs-football-core",
  updatedAt: toIso(0, 8, 40)
};

export const featureExperimentMock: FeatureExperiment = {
  id: "exp-20260405-01",
  modelVersion: "v2.7.1",
  featureSetId: "fs-football-core",
  leagueId: "l-super-lig",
  sportKey: "football",
  from: toIso(-30, 0),
  to: toIso(0, 0),
  status: "running",
  startedAt: toIso(0, 12, 5),
  createdAt: toIso(0, 12, 5),
  updatedAt: toIso(0, 12, 6)
};

export const featureExperimentResultsMock: FeatureExperimentResult[] = [
  {
    id: "exp-res-1",
    experimentId: "exp-20260405-01",
    modelVersion: "v2.7.1",
    featureSetId: "fs-football-core",
    featureSetName: "Football Core v1",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    accuracy: 75.1,
    logLoss: 0.88,
    brierScore: 0.19,
    sampleSize: 420,
    isWinner: true,
    updatedAt: toIso(0, 13, 0)
  },
  {
    id: "exp-res-2",
    experimentId: "exp-20260405-01",
    modelVersion: "v2.7.1",
    featureSetId: "fs-football-variance",
    featureSetName: "Football Variance v2",
    leagueId: "l-super-lig",
    leagueName: "Super Lig",
    accuracy: 73.6,
    logLoss: 0.92,
    brierScore: 0.21,
    sampleSize: 420,
    isWinner: false,
    updatedAt: toIso(0, 13, 0)
  },
  {
    id: "exp-res-3",
    experimentId: "exp-20260404-02",
    modelVersion: "v2.7.1",
    featureSetId: "fs-basketball-core",
    featureSetName: "Basketball Core v1",
    leagueId: "l-nba",
    leagueName: "NBA",
    accuracy: 72.4,
    logLoss: 0.94,
    brierScore: 0.22,
    sampleSize: 510,
    isWinner: true,
    updatedAt: toIso(-1, 18, 30)
  }
];
