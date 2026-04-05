"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MatchQuery, PredictionQuery } from "@/lib/api/query";

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
    const base = {
      sport: searchParams.get("sport") ?? "all",
      leagueId: searchParams.get("leagueId") ?? "",
      teamId: searchParams.get("teamId") ?? "",
      status: searchParams.get("status") ?? "all",
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
  status: filters.status || undefined,
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
  status: filters.status || undefined,
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

