"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SportTabs } from "@/components/filters/SportTabs";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useLeagues } from "@/lib/hooks/use-api";
import { useFilterQueryState } from "@/lib/hooks/use-query-state";
import { cn } from "@/lib/utils";

// Stat Card Component
function StatCard({ label, value, icon, color = "default" }: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  color?: "default" | "accent" | "success";
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border p-4 transition-all",
      color === "accent" ? "border-[#7A84FF]/30 bg-[#7A84FF]/5" : 
      color === "success" ? "border-[#34C759]/30 bg-[#34C759]/5" :
      "border-[#2A3035] bg-[#171C1F]"
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg",
        color === "accent" ? "bg-[#7A84FF] text-black" : 
        color === "success" ? "bg-[#34C759] text-black" :
        "bg-[#1F2529] text-[#9CA3AF]"
      )}>
        {icon}
      </div>
      <div>
        <p className={cn("text-2xl font-bold", color === "accent" ? "text-[#7A84FF]" : color === "success" ? "text-[#34C759]" : "text-[#ECEDEF]")}>{value}</p>
        <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
      </div>
    </div>
  );
}

// League Card Component
function LeagueCard({ league }: { league: { id: string; name: string; country: string; season?: string | null; updatedAt?: string | null } }) {
  return (
    <Link href={`/leagues/${league.id}`} className="group block">
      <article className="h-full rounded-xl border border-[#2A3035] bg-[#171C1F] p-5 transition-all hover:border-[#7A84FF]/50 hover:bg-[#1F2529]">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-[#7A84FF]">{league.country}</span>
            <h3 className="mt-1 text-lg font-bold text-[#ECEDEF] group-hover:text-[#7A84FF] transition-colors">{league.name}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F2529] text-[#9CA3AF] group-hover:bg-[#7A84FF] group-hover:text-black transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-[#9CA3AF]">
          {league.season && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Sezon {league.season}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

function LeaguesPageContent() {
  const { filters, setFilters } = useFilterQueryState();
  const searchParams = useSearchParams();
  const hasExplicitPageSize = searchParams.has("pageSize");
  const effectivePageSize = !hasExplicitPageSize && filters.pageSize === 20 ? 50 : filters.pageSize;

  const leaguesQuery = useLeagues({
    sport: filters.sport,
    page: filters.page,
    pageSize: effectivePageSize
  });
  
  const leagues = useMemo(() => {
    const items = [...(leaguesQuery.data?.data ?? [])];
    const direction = filters.sortOrder === "asc" ? 1 : -1;
    items.sort((left, right) => {
      if (filters.sortBy === "name") return left.name.localeCompare(right.name) * direction;
      if (filters.sortBy === "country") return left.country.localeCompare(right.country) * direction;
      return (left.updatedAt ?? "").localeCompare(right.updatedAt ?? "") * direction;
    });
    return items;
  }, [filters.sortBy, filters.sortOrder, leaguesQuery.data?.data]);
  
  const meta = leaguesQuery.data?.meta;
  const totalLeagues = meta?.total ?? leagues.length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader 
        title="Ligler" 
        description="Futbol ve basketbol ligleri, puan tabloları ve performans görünümleri" 
      />

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Toplam Lig"
          value={totalLeagues}
          color="accent"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Futbol Ligleri"
          value={filters.sport === "football" ? totalLeagues : "-"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          }
        />
        <StatCard
          label="Basketbol Ligleri"
          value={filters.sport === "basketball" ? totalLeagues : "-"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z" />
            </svg>
          }
        />
      </section>

      {/* Filters */}
      <FilterPanel
        primaryFilters={
          <SportTabs 
            value={filters.sport as "all" | "football" | "basketball"} 
            onChange={(value) => setFilters({ sport: value })} 
          />
        }
        advancedFilters={
          <>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ sortBy: e.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF]"
            >
              <option value="updatedAt">Son Güncelleme</option>
              <option value="name">Lig Adı</option>
              <option value="country">Ülke</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters({ sortOrder: e.target.value as "asc" | "desc" })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF]"
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
            <select
              value={effectivePageSize}
              onChange={(e) => setFilters({ pageSize: Number(e.target.value), page: 1 })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF]"
            >
              <option value={10}>10 lig</option>
              <option value={20}>20 lig</option>
              <option value={50}>50 lig</option>
              <option value={100}>Tum ligler</option>
            </select>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-[#9CA3AF]">
              <span className="font-semibold text-[#ECEDEF]">{totalLeagues}</span> lig bulundu
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilters({ page: Math.max(1, filters.page - 1) })}
                disabled={filters.page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3035] bg-[#1F2529] text-sm text-[#ECEDEF] transition-colors hover:border-[#7A84FF] disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="rounded-lg bg-[#1F2529] px-3 py-1.5 text-sm font-semibold text-[#ECEDEF]">
                {filters.page} / {meta?.totalPages ?? 1}
              </span>
              <button
                type="button"
                onClick={() => setFilters({ page: filters.page + 1 })}
                disabled={meta ? filters.page >= meta.totalPages : false}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3035] bg-[#1F2529] text-sm text-[#ECEDEF] transition-colors hover:border-[#7A84FF] disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        }
      />

      {/* Leagues Grid */}
      <DataFeedback
        isLoading={leaguesQuery.isLoading}
        error={leaguesQuery.error as Error | undefined}
        isEmpty={leagues.length === 0}
        emptyTitle="Lig bulunamadı"
        emptyDescription="Seçili filtrelere uygun lig verisi yok."
        onRetry={() => void leaguesQuery.refetch()}
        loadingCount={6}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      </DataFeedback>
    </div>
  );
}

export default function LeaguesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <LeaguesPageContent />
    </Suspense>
  );
}
