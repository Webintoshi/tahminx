export type SportType = "football" | "basketball";

export type MatchStatus = "upcoming" | "live" | "completed";

export type FormResult = "W" | "D" | "L";

export interface MatchScore {
  home: number;
  away: number;
}

export interface MatchProbabilities {
  homeWin: number;
  draw?: number;
  awayWin: number;
}

export interface MatchPrediction {
  expectedHome: number;
  expectedAway: number;
  probabilities: MatchProbabilities;
  confidence: number;
  modelNote: string;
  riskFlags: string[];
}

export interface MatchEvent {
  minute: number;
  team: "home" | "away";
  type: "goal" | "card" | "substitution" | "foul" | "injury";
  description: string;
}

export interface TeamMetricSnapshot {
  attack: number;
  defense: number;
  possession: number;
  pace?: number;
  efficiency?: number;
  xg?: number;
}

export interface Match {
  id: string;
  sport: SportType;
  leagueId: string;
  leagueName: string;
  leagueCountry: string;
  kickoff: string;
  status: MatchStatus;
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: string;
  awayTeam: string;
  score: MatchScore;
  homeForm: FormResult[];
  awayForm: FormResult[];
  homeMetrics: TeamMetricSnapshot;
  awayMetrics: TeamMetricSnapshot;
  prediction: MatchPrediction;
  events: MatchEvent[];
  injuries: string[];
}

export interface StandingRow {
  position: number;
  teamId: string;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  form: FormResult[];
}

export interface League {
  id: string;
  name: string;
  sport: SportType;
  country: string;
  season: string;
  updatedAt: string;
  summary: {
    averageGoalsOrPoints: number;
    homeWinRate: number;
    drawRate?: number;
    awayWinRate: number;
  };
  standings: StandingRow[];
  upcomingMatchIds: string[];
  recentMatchIds: string[];
}

export interface Team {
  id: string;
  name: string;
  sport: SportType;
  leagueId: string;
  city: string;
  coach: string;
  founded: number;
  form: FormResult[];
  homePerformance: number;
  awayPerformance: number;
  attackIndex: number;
  defenseIndex: number;
  roster: string[];
  upcomingMatchIds: string[];
  recentMatchIds: string[];
}

export interface PredictionItem {
  id: string;
  matchId: string;
  sport: SportType;
  leagueId: string;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  expectedScore: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  type: "winner" | "total-score" | "first-half" | "handicap";
  modelExplanation: string;
  probabilities: MatchProbabilities;
}

export interface DashboardPayload {
  todayMatches: number;
  liveMatches: number;
  highConfidenceCount: number;
  updatedLeagues: League[];
  highlightedMatches: Match[];
  highlightedPredictions: PredictionItem[];
  systemPerformance: {
    dailyAccuracy: number;
    weeklyAccuracy: number;
    monthlyAccuracy: number;
  };
  teamPerformanceMini: Array<{
    teamId: string;
    team: string;
    values: number[];
  }>;
}

export interface PerformanceRecord {
  period: string;
  football: number;
  basketball: number;
  overall: number;
}

export interface ModelInsight {
  id: string;
  name: string;
  confidence: number;
  dataReliability: number;
  uncertainty: number;
  explanation: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  priceMonthly: number;
  features: string[];
  recommended?: boolean;
}

export interface AccountProfile {
  id: string;
  fullName: string;
  email: string;
  favoriteLeagues: string[];
  favoriteTeams: string[];
  notifications: {
    liveAlerts: boolean;
    confidenceDropAlerts: boolean;
    weeklyDigest: boolean;
  };
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    generatedAt: string;
    source: "mock" | "api";
  };
}

