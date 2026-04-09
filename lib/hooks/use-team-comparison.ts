"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { TeamComparisonQuery } from "@/lib/api/query";

export function useTeamComparison({
  homeTeamId,
  awayTeamId,
  leagueId,
  seasonId,
  window = "last5",
  enabled = true
}: TeamComparisonQuery & { enabled?: boolean }) {
  const canRun = Boolean(enabled && homeTeamId && awayTeamId);

  return useQuery({
    queryKey: ["team-comparison", { homeTeamId, awayTeamId, leagueId, seasonId, window }],
    queryFn: () =>
      apiClient.getTeamComparison({
        homeTeamId,
        awayTeamId,
        leagueId,
        seasonId,
        window
      }),
    enabled: canRun,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  });
}
