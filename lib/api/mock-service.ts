import { accountProfile, dashboardPayload, leagues, matches, membershipPlans, modelInsights, performanceHistory, predictions, teams } from "@/lib/api/mock-db";
import type { League, Match, PredictionItem, SportType } from "@/types/domain";

export interface MatchFilters {
  sport?: SportType | "all";
  league?: string;
  team?: string;
  status?: "all" | "upcoming" | "live" | "completed";
  date?: string;
}

export interface PredictionFilters {
  sport?: SportType | "all";
  league?: string;
  risk?: "all" | "low" | "medium" | "high";
  type?: "all" | "winner" | "total-score" | "first-half" | "handicap";
}

const normalize = (value: string) => value.trim().toLowerCase();
const normalizeMatchStatus = (value?: string) => {
  if (!value) return value;
  if (value === "scheduled") return "upcoming";
  return value;
};

export const queryMatches = (filters: MatchFilters = {}): Match[] => {
  return matches.filter((match) => {
    if (filters.sport && filters.sport !== "all" && match.sport !== filters.sport) return false;
    if (filters.league && match.leagueId !== filters.league) return false;
    if (
      filters.status &&
      filters.status !== "all" &&
      normalizeMatchStatus(match.status) !== normalizeMatchStatus(filters.status)
    ) {
      return false;
    }
    if (
      filters.team &&
      !normalize(match.homeTeam).includes(normalize(filters.team)) &&
      !normalize(match.awayTeam).includes(normalize(filters.team))
    ) {
      return false;
    }
    if (filters.date) {
      const matchDate = new Date(match.kickoff).toISOString().slice(0, 10);
      if (matchDate !== filters.date) return false;
    }

    return true;
  });
};

export const queryPredictions = (filters: PredictionFilters = {}): PredictionItem[] => {
  return predictions
    .filter((prediction) => {
      if (filters.sport && filters.sport !== "all" && prediction.sport !== filters.sport) return false;
      if (filters.league && prediction.leagueId !== filters.league) return false;
      if (filters.risk && filters.risk !== "all" && prediction.risk !== filters.risk) return false;
      if (filters.type && filters.type !== "all" && prediction.type !== filters.type) return false;
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence);
};

export const getMatchById = (id: string) => matches.find((match) => match.id === id) ?? null;
export const getLeagueById = (id: string) => leagues.find((league) => league.id === id) ?? null;
export const getTeamById = (id: string) => teams.find((team) => team.id === id) ?? null;

export const getLeagueMatches = (leagueId: string): { upcoming: Match[]; recent: Match[] } => {
  const related = matches.filter((match) => match.leagueId === leagueId);
  return {
    upcoming: related.filter((match) => match.status !== "completed"),
    recent: related.filter((match) => match.status === "completed")
  };
};

export const getTeamMatches = (teamId: string): { upcoming: Match[]; recent: Match[] } => {
  const related = matches.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId);
  return {
    upcoming: related.filter((match) => match.status !== "completed"),
    recent: related.filter((match) => match.status === "completed")
  };
};

export const getLeaguesBySport = (sport?: SportType | "all"): League[] => {
  if (!sport || sport === "all") return leagues;
  return leagues.filter((league) => league.sport === sport);
};

export const dashboard = dashboardPayload;
export const liveMatches = matches.filter((match) => match.status === "live");
export const modelData = modelInsights;
export const performanceData = performanceHistory;
export const membershipData = membershipPlans;
export const accountData = accountProfile;
export const allLeagues = leagues;
export const allTeams = teams;

