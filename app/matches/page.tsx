"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SearchInput } from "@/components/filters/SearchInput";
import { SportTabs } from "@/components/filters/SportTabs";
import { MatchCard } from "@/components/cards/MatchCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import {
  useCompletedMatches,
  useLeagues,
  useLiveMatches,
  useMatches,
  useTeams,
  useTodayMatches,
  useTomorrowMatches
} from "@/lib/hooks/use-api";
import { mapFiltersToMatchQuery, useFilterQueryState } from "@/lib/hooks/use-query-state";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "Tümü" },
  { value: "live", label: "Canlı" },
  { value: "scheduled", label: "Planlanan" },
  { value: "completed", label: "Tamamlanan" },
  { value: "postponed", label: "Ertelendi" },
  { value: "cancelled", label: "İptal" }
] as const;

function MatchesPageContent() {
  const { filters, setFilters } = useFilterQueryState();

  const matchQuery = mapFiltersToMatchQuery(filters);
  const matchesQuery = useMatches(matchQuery);
  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const teamsQuery = useTeams({ sport: filters.sport, leagueId: filters.leagueId || undefined, pageSize: 200 });

  const todayQuery = useTodayMatches();
  const tomorrowQuery = useTomorrowMatches();
  const liveQuery = useLiveMatches();
  const completedQuery = useCompletedMatches();

  const matches = matchesQuery.data?.data ?? [];
  const meta = matchesQuery.data?.meta;

  const stats = [
    { key: "today", label: "Bugün", count: todayQuery.data?.data.length ?? 0 },
    { key: "tomorrow", label: "Yarın", count: tomorrowQuery.data?.data.length ?? 0 },
    { key: "live", label: "Canlı", count: liveQuery.data?.data.length ?? 0 },
    { key: "completed", label: "Tamamlanan", count: completedQuery.data?.data.length ?? 0 }
  ] as const;

  const currentPage = meta?.page ?? filters.page;
  const totalPages = meta?.totalPages ?? 1;

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Maçlar"
        description="Fikstür, canlı skor ve tahminler"
      />

      {/* Quick Stats Tabs */}
      <div className="flex flex-wrap gap-2">
        {stats.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => setFilters({ 
              status: stat.key === "today" ? "scheduled" : 
                      stat.key === "tomorrow" ? "scheduled" : 
                      stat.key === "live" ? "live" : 
                      stat.key === "completed" ? "completed" : "all",
              date: stat.key === "today" ? new Date().toISOString().split("T")[0] :
                    stat.key === "tomorrow" ? new Date(Date.now() + 86400000).toISOString().split("T")[0] : ""
            })}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              filters.status === (stat.key === "live" ? "live" : stat.key === "completed" ? "completed" : "scheduled") &&
              (stat.key === "today" || stat.key === "tomorrow" ? filters.date : true)
                ? "border-[#7A84FF] bg-[#7A84FF] text-black"
                : "border-[#2A3035] bg-[#171C1F] text-[#ECEDEF] hover:border-[#3A4047]"
            )}
          >
            <span>{stat.label}</span>
            <span className={cn(
              "rounded px-1.5 py-0.5 text-xs",
              filters.status === (stat.key === "live" ? "live" : stat.key === "completed" ? "completed" : "scheduled")
                ? "bg-black/20"
                : "bg-[#1F2529] text-[#9CA3AF]"
            )}>
              {stat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <FilterPanel
        primaryFilters={
          <>
            <SportTabs 
              value={filters.sport as "all" | "football" | "basketball"} 
              onChange={(value) => setFilters({ sport: value })} 
            />
            
            <select
              value={filters.status}
              onChange={(event) => setFilters({ status: event.target.value })}
              className="h-10 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters({ date: event.target.value })}
              className="h-10 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            />

            <SearchInput 
              value={filters.teamId} 
              onChange={(value) => setFilters({ teamId: value })} 
              placeholder="Takım ara..." 
            />
          </>
        }
        advancedFilters={
          <>
            <select
              value={filters.leagueId}
              onChange={(event) => setFilters({ leagueId: event.target.value })}
              className="h-10 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="">Tüm ligler</option>
              {(leaguesQuery.data?.data ?? []).map((league) => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>

            <select
              value={filters.teamId}
              onChange={(event) => setFilters({ teamId: event.target.value })}
              className="h-10 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="">Tüm takımlar</option>
              {(teamsQuery.data?.data ?? []).map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={filters.minConfidence ?? ""}
              onChange={(event) => setFilters({ minConfidence: event.target.value === "" ? undefined : Number(event.target.value) })}
              className="h-10 w-28 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] placeholder:text-[#9CA3AF] focus:border-[#7A84FF] focus:outline-none"
              placeholder="Min güven"
            />

            <select
              value={filters.sortBy}
              onChange={(event) => setFilters({ sortBy: event.target.value })}
              className="h-10 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="kickoffAt">Tarih</option>
              <option value="confidenceScore">Güven</option>
              <option value="status">Durum</option>
            </select>

            <select
              value={filters.sortOrder}
              onChange={(event) => setFilters({ sortOrder: event.target.value as "asc" | "desc" })}
              className="h-10 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>

            <select
              value={filters.pageSize}
              onChange={(event) => setFilters({ pageSize: Number(event.target.value), page: 1 })}
              className="h-10 rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value={10}>10 / sayfa</option>
              <option value={20}>20 / sayfa</option>
              <option value={50}>50 / sayfa</option>
            </select>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[#9CA3AF]">
              Toplam {meta?.total ?? matches.length} maç
            </p>
            
            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilters({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage <= 1}
                className="rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-1.5 text-sm font-medium text-[#ECEDEF] transition-colors hover:border-[#3A4047] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              
              {getPageNumbers().map((page, idx) => (
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-[#9CA3AF]">...</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setFilters({ page: page as number })}
                    className={cn(
                      "min-w-[2rem] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      currentPage === page
                        ? "bg-[#7A84FF] text-black"
                        : "border border-[#2A3035] bg-[#1F2529] text-[#ECEDEF] hover:border-[#3A4047]"
                    )}
                  >
                    {page}
                  </button>
                )
              ))}
              
              <button
                type="button"
                onClick={() => setFilters({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-1.5 text-sm font-medium text-[#ECEDEF] transition-colors hover:border-[#3A4047] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        }
      />

      {/* Results */}
      <DataFeedback
        isLoading={matchesQuery.isLoading}
        error={matchesQuery.error as Error | undefined}
        isEmpty={matches.length === 0}
        emptyTitle="Maç bulunamadı"
        emptyDescription="Seçili filtrelere uygun maç kaydı bulunmuyor."
        onRetry={() => void matchesQuery.refetch()}
        loadingCount={6}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </DataFeedback>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <MatchesPageContent />
    </Suspense>
  );
}
