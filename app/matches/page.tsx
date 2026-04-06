"use client";

import { Suspense } from "react";
import Link from "next/link";
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

// Stats Card Component
function StatCard({ 
  label, 
  count, 
  icon, 
  isActive, 
  onClick,
  color = "default"
}: { 
  label: string; 
  count: number; 
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  color?: "default" | "live" | "success";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-300",
        isActive 
          ? color === "live"
            ? "border-[#34C759] bg-[#34C759]/10"
            : color === "success"
            ? "border-[#7A84FF] bg-[#7A84FF]/10"
            : "border-[#7A84FF] bg-[#7A84FF]/10"
          : "border-[#2A3035] bg-[#171C1F] hover:border-[#3A4047] hover:bg-[#1F2529]"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        isActive 
          ? color === "live"
            ? "bg-[#34C759] text-black"
            : "bg-[#7A84FF] text-black"
          : "bg-[#1F2529] text-[#9CA3AF] group-hover:text-[#ECEDEF]"
      )}>
        {icon}
      </div>
      <div>
        <p className={cn(
          "text-2xl font-bold transition-colors",
          isActive 
            ? color === "live" ? "text-[#34C759]" : "text-[#7A84FF]"
            : "text-[#ECEDEF]"
        )}>
          {count}
        </p>
        <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
      </div>
      {isActive && (
        <div className={cn(
          "absolute -bottom-px left-4 right-4 h-0.5 rounded-full",
          color === "live" ? "bg-[#34C759]" : "bg-[#7A84FF]"
        )} />
      )}
    </button>
  );
}

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

  const currentPage = meta?.page ?? filters.page;
  const totalPages = meta?.totalPages ?? 1;

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

  const isTodayActive = filters.status === "scheduled" && filters.date === new Date().toISOString().split("T")[0];
  const isTomorrowActive = filters.status === "scheduled" && filters.date === new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const isLiveActive = filters.status === "live";
  const isCompletedActive = filters.status === "completed";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Maçlar"
          description="Fikstür, canlı skor ve tahminler"
        />
        <Link
          href="/football"
          className="flex items-center gap-2 self-start rounded-xl border border-[#2A3035] bg-[#171C1F] px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-all hover:border-[#7A84FF] hover:text-[#ECEDEF]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
          Analiz Modülü
        </Link>
      </div>

      {/* Stats Grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bugün"
          count={todayQuery.data?.data.length ?? 0}
          color="success"
          isActive={isTodayActive}
          onClick={() => setFilters({ 
            status: "scheduled",
            date: new Date().toISOString().split("T")[0]
          })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Yarın"
          count={tomorrowQuery.data?.data.length ?? 0}
          isActive={isTomorrowActive}
          onClick={() => setFilters({ 
            status: "scheduled",
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0]
          })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Canlı"
          count={liveQuery.data?.data.length ?? 0}
          color="live"
          isActive={isLiveActive}
          onClick={() => setFilters({ status: "live", date: "" })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label="Tamamlanan"
          count={completedQuery.data?.data.length ?? 0}
          isActive={isCompletedActive}
          onClick={() => setFilters({ status: "completed", date: "" })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </section>

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
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] transition-colors focus:border-[#7A84FF] focus:outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters({ date: event.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] transition-colors focus:border-[#7A84FF] focus:outline-none"
            />

            <div className="min-w-[200px] flex-1">
              <SearchInput 
                value={filters.teamId} 
                onChange={(value) => setFilters({ teamId: value })} 
                placeholder="Takım ara..." 
              />
            </div>
          </>
        }
        advancedFilters={
          <>
            <select
              value={filters.leagueId}
              onChange={(event) => setFilters({ leagueId: event.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] transition-colors focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="">Tüm ligler</option>
              {(leaguesQuery.data?.data ?? []).map((league) => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>

            <select
              value={filters.teamId}
              onChange={(event) => setFilters({ teamId: event.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] transition-colors focus:border-[#7A84FF] focus:outline-none"
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
              className="h-11 w-32 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] placeholder:text-[#9CA3AF] transition-colors focus:border-[#7A84FF] focus:outline-none"
              placeholder="Min güven %"
            />

            <select
              value={filters.sortBy}
              onChange={(event) => setFilters({ sortBy: event.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] transition-colors focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="kickoffAt">Tarihe göre</option>
              <option value="confidenceScore">Güven skoruna göre</option>
              <option value="status">Duruma göre</option>
            </select>

            <select
              value={filters.sortOrder}
              onChange={(event) => setFilters({ sortOrder: event.target.value as "asc" | "desc" })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] transition-colors focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="desc">Önce yeniler</option>
              <option value="asc">Önce eskiler</option>
            </select>

            <select
              value={filters.pageSize}
              onChange={(event) => setFilters({ pageSize: Number(event.target.value), page: 1 })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] transition-colors focus:border-[#7A84FF] focus:outline-none"
            >
              <option value={10}>10 maç</option>
              <option value={20}>20 maç</option>
              <option value={50}>50 maç</option>
            </select>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
              <span className="rounded-lg bg-[#1F2529] px-3 py-1.5 font-semibold text-[#ECEDEF]">
                {meta?.total ?? matches.length}
              </span>
              <span>maç bulundu</span>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilters({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3035] bg-[#1F2529] text-sm font-medium text-[#ECEDEF] transition-colors hover:border-[#7A84FF] hover:text-[#7A84FF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
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
                      "h-9 min-w-[2.25rem] rounded-lg px-3 text-sm font-semibold transition-all",
                      currentPage === page
                        ? "bg-[#7A84FF] text-black"
                        : "border border-[#2A3035] bg-[#1F2529] text-[#ECEDEF] hover:border-[#7A84FF] hover:text-[#7A84FF]"
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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3035] bg-[#1F2529] text-sm font-medium text-[#ECEDEF] transition-colors hover:border-[#7A84FF] hover:text-[#7A84FF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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
