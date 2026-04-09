import type { TeamComparisonQuery } from "@/lib/api/query";
import type { ComparisonVisualizationData } from "@/types/api-contract";

export const TEAM_COMPARISON_WINDOWS = [
  { value: "last3", label: "Son 3 mac" },
  { value: "last5", label: "Son 5 mac" },
  { value: "last10", label: "Son 10 mac" }
] as const;

export const TEAM_COMPARISON_CARD_KEYS = [
  "overallStrength",
  "attack",
  "defense",
  "form",
  "homeAway",
  "tempo",
  "setPiece",
  "transition",
  "squadIntegrity"
] as const;

export type TeamComparisonFormState = {
  homeTeamId: string;
  awayTeamId: string;
  leagueId: string;
  seasonId: string;
  window: "last3" | "last5" | "last10";
};

export const DEFAULT_TEAM_COMPARISON_STATE: TeamComparisonFormState = {
  homeTeamId: "",
  awayTeamId: "",
  leagueId: "",
  seasonId: "",
  window: "last5"
};

const getFirst = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const parseTeamComparisonQuery = (
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>
): TeamComparisonFormState => {
  const read = (key: keyof TeamComparisonFormState) => {
    if (!searchParams) return undefined;
    if (searchParams instanceof URLSearchParams) return searchParams.get(key) ?? undefined;
    return getFirst(searchParams[key]);
  };

  const windowValue = read("window");

  return {
    homeTeamId: read("homeTeamId") ?? "",
    awayTeamId: read("awayTeamId") ?? "",
    leagueId: read("leagueId") ?? "",
    seasonId: read("seasonId") ?? "",
    window: windowValue === "last3" || windowValue === "last10" ? windowValue : "last5"
  };
};

export const buildTeamComparisonQuery = (state: TeamComparisonFormState): TeamComparisonQuery => ({
  homeTeamId: state.homeTeamId,
  awayTeamId: state.awayTeamId,
  leagueId: state.leagueId || undefined,
  seasonId: state.seasonId || undefined,
  window: state.window
});

export const buildTeamComparisonSearch = (state: TeamComparisonFormState) => {
  const params = new URLSearchParams();
  if (state.homeTeamId) params.set("homeTeamId", state.homeTeamId);
  if (state.awayTeamId) params.set("awayTeamId", state.awayTeamId);
  if (state.leagueId) params.set("leagueId", state.leagueId);
  if (state.seasonId) params.set("seasonId", state.seasonId);
  if (state.window) params.set("window", state.window);
  return params.toString();
};

export const isTeamComparisonReady = (state: TeamComparisonFormState) =>
  Boolean(state.homeTeamId && state.awayTeamId && state.homeTeamId !== state.awayTeamId);

export const getTeamComparisonValidationMessage = (state: TeamComparisonFormState) => {
  if (!state.homeTeamId || !state.awayTeamId) {
    return "Ev sahibi ve deplasman secimi gerekli.";
  }

  if (state.homeTeamId === state.awayTeamId) {
    return "Ayni takim iki kez secilemez.";
  }

  return "";
};

export const visualizationMetricEntries = (visualization: ComparisonVisualizationData) => [
  { key: "attackScore", label: "Hucum", home: visualization.homeValues.attackScore ?? visualization.attackScore, away: visualization.awayValues.attackScore ?? 0 },
  { key: "defenseScore", label: "Savunma", home: visualization.homeValues.defenseScore ?? visualization.defenseScore, away: visualization.awayValues.defenseScore ?? 0 },
  { key: "formScore", label: "Form", home: visualization.homeValues.formScore ?? visualization.formScore, away: visualization.awayValues.formScore ?? 0 },
  { key: "homeAwayScore", label: "Ic saha / deplasman", home: visualization.homeValues.homeAwayScore ?? visualization.homeAwayScore, away: visualization.awayValues.homeAwayScore ?? 0 },
  { key: "tempoScore", label: "Tempo", home: visualization.homeValues.tempoScore ?? visualization.tempoScore, away: visualization.awayValues.tempoScore ?? 0 },
  { key: "transitionScore", label: "Gecis", home: visualization.homeValues.transitionScore ?? visualization.transitionScore, away: visualization.awayValues.transitionScore ?? 0 },
  { key: "setPieceScore", label: "Duran top", home: visualization.homeValues.setPieceScore ?? visualization.setPieceScore, away: visualization.awayValues.setPieceScore ?? 0 },
  { key: "resilienceScore", label: "Dayaniklilik", home: visualization.homeValues.resilienceScore ?? visualization.resilienceScore, away: visualization.awayValues.resilienceScore ?? 0 }
];
