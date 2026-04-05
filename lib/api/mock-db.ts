import type {
  AccountProfile,
  DashboardPayload,
  League,
  Match,
  MembershipPlan,
  ModelInsight,
  PerformanceRecord,
  PredictionItem,
  Team
} from "@/types/domain";

const now = new Date();

const iso = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const matches: Match[] = [
  {
    id: "m1",
    sport: "football",
    leagueId: "l1",
    leagueName: "Super Lig",
    leagueCountry: "Turkiye",
    kickoff: iso(0, 20, 0),
    status: "upcoming",
    venue: "Rams Park",
    homeTeamId: "t1",
    awayTeamId: "t2",
    homeTeam: "Galatasaray",
    awayTeam: "Fenerbahce",
    score: { home: 0, away: 0 },
    homeForm: ["W", "W", "D", "W", "W"],
    awayForm: ["W", "D", "W", "W", "L"],
    homeMetrics: { attack: 82, defense: 74, possession: 59, xg: 1.9 },
    awayMetrics: { attack: 80, defense: 76, possession: 57, xg: 1.8 },
    prediction: {
      expectedHome: 1.7,
      expectedAway: 1.3,
      probabilities: { homeWin: 44, draw: 27, awayWin: 29 },
      confidence: 78,
      modelNote: "Home pressure and final-third control are above league average.",
      riskFlags: ["Derby volatility", "High tactical adaptation risk"]
    },
    events: [],
    injuries: ["F. Midfielder - muscle strain", "Reserve winger - illness"]
  },
  {
    id: "m2",
    sport: "football",
    leagueId: "l2",
    leagueName: "Premier League",
    leagueCountry: "England",
    kickoff: iso(0, 22, 0),
    status: "live",
    venue: "Anfield",
    homeTeamId: "t3",
    awayTeamId: "t4",
    homeTeam: "Liverpool",
    awayTeam: "Arsenal",
    score: { home: 2, away: 1 },
    homeForm: ["W", "W", "W", "D", "W"],
    awayForm: ["W", "W", "D", "W", "W"],
    homeMetrics: { attack: 87, defense: 73, possession: 62, xg: 2.2 },
    awayMetrics: { attack: 84, defense: 75, possession: 60, xg: 1.9 },
    prediction: {
      expectedHome: 2.1,
      expectedAway: 1.4,
      probabilities: { homeWin: 52, draw: 23, awayWin: 25 },
      confidence: 81,
      modelNote: "Pressing sequence success is materially higher in home side.",
      riskFlags: ["Late game fatigue variance"]
    },
    events: [
      { minute: 11, team: "home", type: "goal", description: "Inside box finish after counter attack" },
      { minute: 29, team: "away", type: "goal", description: "Set-piece equalizer" },
      { minute: 54, team: "home", type: "goal", description: "Far-post header from corner" },
      { minute: 70, team: "away", type: "card", description: "Tactical yellow card" }
    ],
    injuries: ["Away centre-back - hamstring"]
  },
  {
    id: "m3",
    sport: "football",
    leagueId: "l1",
    leagueName: "Super Lig",
    leagueCountry: "Turkiye",
    kickoff: iso(-1, 19, 0),
    status: "completed",
    venue: "Papara Park",
    homeTeamId: "t5",
    awayTeamId: "t6",
    homeTeam: "Trabzonspor",
    awayTeam: "Besiktas",
    score: { home: 1, away: 1 },
    homeForm: ["D", "W", "L", "W", "D"],
    awayForm: ["W", "L", "W", "D", "W"],
    homeMetrics: { attack: 70, defense: 69, possession: 51, xg: 1.2 },
    awayMetrics: { attack: 74, defense: 68, possession: 53, xg: 1.4 },
    prediction: {
      expectedHome: 1.1,
      expectedAway: 1.2,
      probabilities: { homeWin: 34, draw: 35, awayWin: 31 },
      confidence: 63,
      modelNote: "Balanced midfield battle produced low-separation outcomes.",
      riskFlags: ["Set-piece variance"]
    },
    events: [
      { minute: 18, team: "away", type: "goal", description: "Right-foot finish in transition" },
      { minute: 61, team: "home", type: "goal", description: "Long-range strike" }
    ],
    injuries: []
  },
  {
    id: "m4",
    sport: "basketball",
    leagueId: "l3",
    leagueName: "EuroLeague",
    leagueCountry: "Europe",
    kickoff: iso(0, 21, 30),
    status: "upcoming",
    venue: "Ulker Sports Arena",
    homeTeamId: "t7",
    awayTeamId: "t8",
    homeTeam: "Fenerbahce Beko",
    awayTeam: "Real Madrid",
    score: { home: 0, away: 0 },
    homeForm: ["W", "W", "L", "W", "W"],
    awayForm: ["W", "W", "W", "D", "W"],
    homeMetrics: { attack: 85, defense: 77, possession: 50, pace: 73, efficiency: 1.12 },
    awayMetrics: { attack: 88, defense: 79, possession: 50, pace: 71, efficiency: 1.15 },
    prediction: {
      expectedHome: 84,
      expectedAway: 82,
      probabilities: { homeWin: 49, awayWin: 51 },
      confidence: 72,
      modelNote: "Second-unit defense matchup is slightly favorable for home side.",
      riskFlags: ["Three-point variance", "Back-to-back fatigue risk"]
    },
    events: [],
    injuries: ["Away rotation guard - questionable"]
  },
  {
    id: "m5",
    sport: "basketball",
    leagueId: "l4",
    leagueName: "NBA",
    leagueCountry: "USA",
    kickoff: iso(0, 4, 0),
    status: "live",
    venue: "TD Garden",
    homeTeamId: "t9",
    awayTeamId: "t10",
    homeTeam: "Boston Celtics",
    awayTeam: "Milwaukee Bucks",
    score: { home: 74, away: 70 },
    homeForm: ["W", "W", "W", "L", "W"],
    awayForm: ["W", "L", "W", "W", "W"],
    homeMetrics: { attack: 90, defense: 81, possession: 50, pace: 99, efficiency: 1.18 },
    awayMetrics: { attack: 89, defense: 78, possession: 50, pace: 101, efficiency: 1.16 },
    prediction: {
      expectedHome: 116,
      expectedAway: 111,
      probabilities: { homeWin: 57, awayWin: 43 },
      confidence: 79,
      modelNote: "Half-court offense stability increases late game edge.",
      riskFlags: ["Foul trouble sensitivity"]
    },
    events: [
      { minute: 8, team: "home", type: "goal", description: "7-0 run started by corner three" },
      { minute: 15, team: "away", type: "foul", description: "Defensive foul on drive" },
      { minute: 24, team: "home", type: "goal", description: "Transition dunk after steal" }
    ],
    injuries: []
  },
  {
    id: "m6",
    sport: "basketball",
    leagueId: "l4",
    leagueName: "NBA",
    leagueCountry: "USA",
    kickoff: iso(-1, 3, 30),
    status: "completed",
    venue: "Chase Center",
    homeTeamId: "t11",
    awayTeamId: "t12",
    homeTeam: "Golden State Warriors",
    awayTeam: "Denver Nuggets",
    score: { home: 108, away: 112 },
    homeForm: ["L", "W", "W", "L", "W"],
    awayForm: ["W", "W", "L", "W", "W"],
    homeMetrics: { attack: 86, defense: 70, possession: 50, pace: 102, efficiency: 1.09 },
    awayMetrics: { attack: 88, defense: 76, possession: 50, pace: 97, efficiency: 1.14 },
    prediction: {
      expectedHome: 110,
      expectedAway: 114,
      probabilities: { homeWin: 41, awayWin: 59 },
      confidence: 75,
      modelNote: "Interior efficiency mismatch favored away side.",
      riskFlags: ["Bench scoring volatility"]
    },
    events: [
      { minute: 35, team: "away", type: "goal", description: "Late pick-and-roll finish" },
      { minute: 40, team: "home", type: "foul", description: "Shooting foul in clutch" }
    ],
    injuries: ["Home forward - ankle soreness"]
  }
];

export const leagues: League[] = [
  {
    id: "l1",
    name: "Super Lig",
    sport: "football",
    country: "Turkiye",
    season: "2025/26",
    updatedAt: iso(0, 18, 35),
    summary: { averageGoalsOrPoints: 2.78, homeWinRate: 46, drawRate: 27, awayWinRate: 27 },
    standings: [
      { position: 1, teamId: "t1", team: "Galatasaray", played: 29, wins: 22, draws: 5, losses: 2, points: 71, form: ["W", "W", "D", "W", "W"] },
      { position: 2, teamId: "t2", team: "Fenerbahce", played: 29, wins: 21, draws: 4, losses: 4, points: 67, form: ["W", "D", "W", "W", "L"] },
      { position: 3, teamId: "t6", team: "Besiktas", played: 29, wins: 17, draws: 6, losses: 6, points: 57, form: ["W", "L", "W", "D", "W"] }
    ],
    upcomingMatchIds: ["m1"],
    recentMatchIds: ["m3"]
  },
  {
    id: "l2",
    name: "Premier League",
    sport: "football",
    country: "England",
    season: "2025/26",
    updatedAt: iso(0, 22, 40),
    summary: { averageGoalsOrPoints: 2.95, homeWinRate: 48, drawRate: 23, awayWinRate: 29 },
    standings: [
      { position: 1, teamId: "t3", team: "Liverpool", played: 31, wins: 22, draws: 6, losses: 3, points: 72, form: ["W", "W", "W", "D", "W"] },
      { position: 2, teamId: "t4", team: "Arsenal", played: 31, wins: 21, draws: 7, losses: 3, points: 70, form: ["W", "W", "D", "W", "W"] }
    ],
    upcomingMatchIds: ["m2"],
    recentMatchIds: ["m2"]
  },
  {
    id: "l3",
    name: "EuroLeague",
    sport: "basketball",
    country: "Europe",
    season: "2025/26",
    updatedAt: iso(0, 16, 0),
    summary: { averageGoalsOrPoints: 163.4, homeWinRate: 52, awayWinRate: 48 },
    standings: [
      { position: 1, teamId: "t8", team: "Real Madrid", played: 31, wins: 23, draws: 0, losses: 8, points: 46, form: ["W", "W", "W", "D", "W"] },
      { position: 2, teamId: "t7", team: "Fenerbahce Beko", played: 31, wins: 21, draws: 0, losses: 10, points: 42, form: ["W", "W", "L", "W", "W"] }
    ],
    upcomingMatchIds: ["m4"],
    recentMatchIds: []
  },
  {
    id: "l4",
    name: "NBA",
    sport: "basketball",
    country: "USA",
    season: "2025/26",
    updatedAt: iso(0, 5, 15),
    summary: { averageGoalsOrPoints: 227.3, homeWinRate: 55, awayWinRate: 45 },
    standings: [
      { position: 1, teamId: "t9", team: "Boston Celtics", played: 72, wins: 52, draws: 0, losses: 20, points: 104, form: ["W", "W", "W", "L", "W"] },
      { position: 2, teamId: "t10", team: "Milwaukee Bucks", played: 72, wins: 49, draws: 0, losses: 23, points: 98, form: ["W", "L", "W", "W", "W"] },
      { position: 3, teamId: "t12", team: "Denver Nuggets", played: 72, wins: 48, draws: 0, losses: 24, points: 96, form: ["W", "W", "L", "W", "W"] }
    ],
    upcomingMatchIds: ["m5"],
    recentMatchIds: ["m6"]
  }
];

export const teams: Team[] = [
  {
    id: "t1",
    name: "Galatasaray",
    sport: "football",
    leagueId: "l1",
    city: "Istanbul",
    coach: "Okan Buruk",
    founded: 1905,
    form: ["W", "W", "D", "W", "W"],
    homePerformance: 84,
    awayPerformance: 74,
    attackIndex: 82,
    defenseIndex: 75,
    roster: ["Muslera", "Bardakci", "Torreira", "Mertens", "Icardi"],
    upcomingMatchIds: ["m1"],
    recentMatchIds: ["m3"]
  },
  {
    id: "t2",
    name: "Fenerbahce",
    sport: "football",
    leagueId: "l1",
    city: "Istanbul",
    coach: "Ismail Kartal",
    founded: 1907,
    form: ["W", "D", "W", "W", "L"],
    homePerformance: 79,
    awayPerformance: 80,
    attackIndex: 80,
    defenseIndex: 76,
    roster: ["Livakovic", "Djiku", "Fred", "Szymanski", "Dzeko"],
    upcomingMatchIds: ["m1"],
    recentMatchIds: []
  },
  {
    id: "t3",
    name: "Liverpool",
    sport: "football",
    leagueId: "l2",
    city: "Liverpool",
    coach: "Arne Slot",
    founded: 1892,
    form: ["W", "W", "W", "D", "W"],
    homePerformance: 86,
    awayPerformance: 77,
    attackIndex: 87,
    defenseIndex: 73,
    roster: ["Alisson", "Van Dijk", "Mac Allister", "Salah", "Diaz"],
    upcomingMatchIds: ["m2"],
    recentMatchIds: ["m2"]
  },
  {
    id: "t4",
    name: "Arsenal",
    sport: "football",
    leagueId: "l2",
    city: "London",
    coach: "Mikel Arteta",
    founded: 1886,
    form: ["W", "W", "D", "W", "W"],
    homePerformance: 82,
    awayPerformance: 78,
    attackIndex: 84,
    defenseIndex: 75,
    roster: ["Raya", "Saliba", "Rice", "Odegaard", "Saka"],
    upcomingMatchIds: ["m2"],
    recentMatchIds: ["m2"]
  },
  {
    id: "t7",
    name: "Fenerbahce Beko",
    sport: "basketball",
    leagueId: "l3",
    city: "Istanbul",
    coach: "Sarunas Jasikevicius",
    founded: 1913,
    form: ["W", "W", "L", "W", "W"],
    homePerformance: 82,
    awayPerformance: 73,
    attackIndex: 85,
    defenseIndex: 77,
    roster: ["Wilbekin", "Calathes", "Hayes-Davis", "Guduric", "Sanli"],
    upcomingMatchIds: ["m4"],
    recentMatchIds: []
  },
  {
    id: "t8",
    name: "Real Madrid",
    sport: "basketball",
    leagueId: "l3",
    city: "Madrid",
    coach: "Chus Mateo",
    founded: 1931,
    form: ["W", "W", "W", "D", "W"],
    homePerformance: 85,
    awayPerformance: 80,
    attackIndex: 88,
    defenseIndex: 79,
    roster: ["Campazzo", "Hezonja", "Musa", "Tavares", "Deck"],
    upcomingMatchIds: ["m4"],
    recentMatchIds: []
  },
  {
    id: "t9",
    name: "Boston Celtics",
    sport: "basketball",
    leagueId: "l4",
    city: "Boston",
    coach: "Joe Mazzulla",
    founded: 1946,
    form: ["W", "W", "W", "L", "W"],
    homePerformance: 89,
    awayPerformance: 79,
    attackIndex: 90,
    defenseIndex: 81,
    roster: ["Tatum", "Brown", "Holiday", "Porzingis", "White"],
    upcomingMatchIds: ["m5"],
    recentMatchIds: []
  },
  {
    id: "t10",
    name: "Milwaukee Bucks",
    sport: "basketball",
    leagueId: "l4",
    city: "Milwaukee",
    coach: "Doc Rivers",
    founded: 1968,
    form: ["W", "L", "W", "W", "W"],
    homePerformance: 84,
    awayPerformance: 76,
    attackIndex: 89,
    defenseIndex: 78,
    roster: ["Lillard", "Antetokounmpo", "Lopez", "Middleton", "Portis"],
    upcomingMatchIds: ["m5"],
    recentMatchIds: []
  }
];

export const predictions: PredictionItem[] = matches.map((match, index) => {
  const risk =
    match.prediction.confidence >= 78
      ? "low"
      : match.prediction.confidence >= 68
        ? "medium"
        : "high";

  return {
    id: `p${index + 1}`,
    matchId: match.id,
    sport: match.sport,
    leagueId: match.leagueId,
    leagueName: match.leagueName,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoff: match.kickoff,
    expectedScore: `${match.prediction.expectedHome}-${match.prediction.expectedAway}`,
    confidence: match.prediction.confidence,
    risk,
    type: match.sport === "football" ? "winner" : "total-score",
    modelExplanation: match.prediction.modelNote,
    probabilities: match.prediction.probabilities
  };
});

export const performanceHistory: PerformanceRecord[] = [
  { period: "Pzt", football: 73, basketball: 69, overall: 71 },
  { period: "Sali", football: 75, basketball: 70, overall: 73 },
  { period: "Cars", football: 78, basketball: 72, overall: 75 },
  { period: "Pers", football: 76, basketball: 74, overall: 75 },
  { period: "Cum", football: 80, basketball: 76, overall: 78 },
  { period: "Cmt", football: 82, basketball: 77, overall: 80 },
  { period: "Paz", football: 79, basketball: 78, overall: 79 }
];

export const modelInsights: ModelInsight[] = [
  {
    id: "model-1",
    name: "Hybrid Match Probability Engine",
    confidence: 82,
    dataReliability: 88,
    uncertainty: 16,
    explanation: "Combines form, tactical context, and market drift features with calibrated outputs."
  },
  {
    id: "model-2",
    name: "Live Momentum Adapter",
    confidence: 76,
    dataReliability: 81,
    uncertainty: 22,
    explanation: "Updates confidence using event velocity and in-game possession momentum."
  },
  {
    id: "model-3",
    name: "Scenario Stress Tester",
    confidence: 71,
    dataReliability: 79,
    uncertainty: 28,
    explanation: "Runs high-variance simulations to expose fragile prediction scenarios."
  }
];

export const membershipPlans: MembershipPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    features: ["Daily dashboard", "League overview", "Basic confidence cards"]
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    recommended: true,
    features: ["All analysis modules", "Live analysis", "Team and league deep-dive", "Exportable reports"]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 129,
    features: ["Team seats", "Custom model explainability", "Priority support", "Advanced API access"]
  }
];

export const accountProfile: AccountProfile = {
  id: "u1",
  fullName: "Mert Aydin",
  email: "mert@tahminx.app",
  favoriteLeagues: ["Super Lig", "EuroLeague"],
  favoriteTeams: ["Galatasaray", "Fenerbahce Beko"],
  notifications: {
    liveAlerts: true,
    confidenceDropAlerts: true,
    weeklyDigest: false
  }
};

export const dashboardPayload: DashboardPayload = {
  todayMatches: matches.filter((m) => {
    const date = new Date(m.kickoff);
    return date.toDateString() === now.toDateString();
  }).length,
  liveMatches: matches.filter((m) => m.status === "live").length,
  highConfidenceCount: predictions.filter((p) => p.confidence >= 78).length,
  updatedLeagues: leagues.slice(0, 3),
  highlightedMatches: matches.slice(0, 4),
  highlightedPredictions: predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
  systemPerformance: {
    dailyAccuracy: 77.4,
    weeklyAccuracy: 79.1,
    monthlyAccuracy: 76.8
  },
  teamPerformanceMini: [
    { teamId: "t1", team: "Galatasaray", values: [68, 72, 76, 79, 81, 83] },
    { teamId: "t3", team: "Liverpool", values: [70, 74, 73, 78, 82, 84] },
    { teamId: "t9", team: "Boston Celtics", values: [66, 71, 75, 78, 80, 85] }
  ]
};

