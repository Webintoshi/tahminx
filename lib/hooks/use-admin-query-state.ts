"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SportKey } from "@/types/api-contract";

const parsePositiveInt = (value: string | null, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const parseBooleanOrUndefined = (value: string | null) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export type AdminFilters = {
  sport: "all" | SportKey;
  leagueId: string;
  modelVersion: string;
  predictionType: string;
  isActive?: boolean;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onlyHighConfidenceFailed?: boolean;
};

export function useAdminQueryState(defaultSortBy = "updatedAt") {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<AdminFilters>(
    () => ({
      sport: (searchParams.get("sport") as "all" | SportKey) ?? "all",
      leagueId: searchParams.get("leagueId") ?? "",
      modelVersion: searchParams.get("modelVersion") ?? "",
      predictionType: searchParams.get("predictionType") ?? "",
      isActive: parseBooleanOrUndefined(searchParams.get("isActive")),
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
      page: parsePositiveInt(searchParams.get("page"), 1),
      pageSize: parsePositiveInt(searchParams.get("pageSize"), 20),
      sortBy: searchParams.get("sortBy") ?? defaultSortBy,
      sortOrder: (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc",
      onlyHighConfidenceFailed: parseBooleanOrUndefined(searchParams.get("onlyHighConfidenceFailed"))
    }),
    [defaultSortBy, searchParams]
  );

  const setFilters = useCallback(
    (partial: Partial<AdminFilters>) => {
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
