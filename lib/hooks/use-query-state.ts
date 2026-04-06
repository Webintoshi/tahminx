"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
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

const parseFiltersFromSearchParams = (searchParams: URLSearchParams | ReadonlyURLSearchParams) => {
  const rawStatus = searchParams.get("status") ?? "all";
  const rawRiskLevel = searchParams.get("riskLevel");
  const riskLevel = rawRiskLevel ?? (riskLevels.has(rawStatus) ? rawStatus : "all");

  return {
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
};

type FilterState = ReturnType<typeof parseFiltersFromSearchParams>;

export function useFilterQueryState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const parsedFilters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams]);
  const [filters, setFiltersState] = useState<FilterState>(parsedFilters);

  useEffect(() => {
    setFiltersState(parsedFilters);
  }, [parsedFilters]);

  const setFilters = useCallback(
    (partial: Partial<FilterState>) => {
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
      const nextFilters = parseFiltersFromSearchParams(params);
      setFiltersState(nextFilters);

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
      }
    },
    [pathname, searchParams]
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
