"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MatchQuery, PredictionQuery } from "@/lib/api/query";

const matchStatuses = new Set(["scheduled", "live", "completed", "postponed", "cancelled"]);
const riskLevels = new Set(["low", "medium", "high"]);

const parsePositiveInt = (value: string | null, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const parseNumberOrUndefined = (value: string | null) => {
  if (value == null || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseBooleanOrUndefined = (value: string | null) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export function useFilterQueryState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => {
    const rawStatus = searchParams.get("status") ?? "all";
    const rawRiskLevel = searchParams.get("riskLevel");
    const riskLevel = rawRiskLevel ?? (riskLevels.has(rawStatus) ? rawStatus : "all");

    const base = {
      sport: searchParams.get("sport") ?? "all",
      leagueId: searchParams.get("leagueId") ?? "",
      teamId: searchParams.get("teamId") ?? "",
      status: rawStatus,
      riskLevel,
      date: searchParams.get("date") ?? "",
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
      minConfidence: parseNumberOrUndefined(searchParams.get("minConfidence")),
      isLowConfidence: parseBooleanOrUndefined(searchParams.get("isLowConfidence")),
      isRecommended: parseBooleanOrUndefined(searchParams.get("isRecommended")),
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: parsePositiveInt(searchParams.get("pageSize"), 20),
      sortBy: searchParams.get("sortBy") ?? "kickoffAt",
      sortOrder: (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc"
    };

    return base;
  }, [searchParams]);

  const setFilters = useCallback(
    (partial: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(partial).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      if (partial.page === undefined && partial.pageSize === undefined) {
        params.set("page", "1");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { filters, setFilters };
}

export const mapFiltersToMatchQuery = (filters: ReturnType<typeof useFilterQueryState>["filters"]): MatchQuery => ({
  sport: filters.sport,
  leagueId: filters.leagueId || undefined,
  teamId: filters.teamId || undefined,
  status: matchStatuses.has(filters.status) ? filters.status : undefined,
  date: filters.date || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
  minConfidence: filters.minConfidence,
  page: filters.page,
  pageSize: filters.pageSize,
  sortBy: filters.sortBy,
  sortOrder: filters.sortOrder
});

export const mapFiltersToPredictionQuery = (
  filters: ReturnType<typeof useFilterQueryState>["filters"]
): PredictionQuery => ({
  sport: filters.sport,
  leagueId: filters.leagueId || undefined,
  teamId: filters.teamId || undefined,
  status: matchStatuses.has(filters.status) ? filters.status : undefined,
  date: filters.date || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
  minConfidence: filters.minConfidence,
  isLowConfidence: filters.isLowConfidence,
  isRecommended: filters.isRecommended,
  page: filters.page,
  pageSize: filters.pageSize,
  sortBy: filters.sortBy,
  sortOrder: filters.sortOrder
});
