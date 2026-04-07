"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SportTabs } from "@/components/filters/SportTabs";
import { TeamFormCard } from "@/components/cards/TeamFormCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useLeagues, useTeamForm, useTeams } from "@/lib/hooks/use-api";
import { useFilterQueryState } from "@/lib/hooks/use-query-state";
import type { TeamListItem } from "@/types/api-contract";
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

// Team Card with Form
function TeamCardWithForm({ team }: { team: TeamListItem }) {
  const formQuery = useTeamForm(team.id);
  const form = formQuery.data?.data ?? [];
  const last5Results = form.slice(0, 5);

  return (
    <Link href={`/teams/${team.id}`} className="group block">
      <article className="h-full rounded-xl border border-[#2A3035] bg-[#171C1F] p-5 transition-all hover:border-[#7A84FF]/50 hover:bg-[#1F2529]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="h-12 w-12 rounded-xl border border-[#2A3035] bg-[#1F2529] object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#2A3035] bg-[#1F2529] text-lg font-bold text-[#7A84FF]">
                {team.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-[#ECEDEF] group-hover:text-[#7A84FF] transition-colors">{team.name}</h3>
              {team.city && <p className="text-xs text-[#9CA3AF]">{team.city}</p>}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F2529] text-[#9CA3AF] group-hover:bg-[#7A84FF] group-hover:text-black transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Recent Form */}
        {last5Results.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-[#9CA3AF] mb-2">Son 5 Maç</p>
            <div className="flex gap-1.5">
              {last5Results.map((match, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                    match.result === "W" ? "bg-[#34C759] text-black" :
                    match.result === "L" ? "bg-[#FF3B30] text-white" :
                    "bg-[#9CA3AF] text-black"
                  )}
                >
                  {match.result === "W" ? "G" : match.result === "L" ? "M" : "B"}
                </span>
              ))}
            </div>
          </div>
        )}

        {team.city && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#9CA3AF]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {team.city}
          </div>
        )}
      </article>
    </Link>
  );
}

function TeamsPageContent() {
  const { filters, setFilters } = useFilterQueryState();
  const teamsQuery = useTeams({
    sport: filters.sport,
    leagueId: filters.leagueId || undefined,
    page: filters.page,
    pageSize: filters.pageSize
  });
  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });

  const teams = useMemo(() => {
    const items = [...(teamsQuery.data?.data ?? [])];
    const direction = filters.sortOrder === "asc" ? 1 : -1;
    items.sort((left, right) => {
      if (filters.sortBy === "city") return (left.city ?? "").localeCompare(right.city ?? "") * direction;
      return left.name.localeCompare(right.name) * direction;
    });
    return items;
  }, [filters.sortBy, filters.sortOrder, teamsQuery.data?.data]);
  
  const meta = teamsQuery.data?.meta;
  const totalTeams = meta?.total ?? teams.length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader 
        title="Takımlar" 
        description="Takım listesi, profil metrikleri ve form odaklı görünüm" 
      />

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Toplam Takım"
          value={totalTeams}
          color="accent"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Aktif Lig"
          value={filters.leagueId ? "Seçili" : "Tümü"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          }
        />
        <StatCard
          label="Spor Türü"
          value={filters.sport === "all" ? "Tümü" : filters.sport === "football" ? "Futbol" : "Basketbol"}
          color="success"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
              value={filters.leagueId}
              onChange={(e) => setFilters({ leagueId: e.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF]"
            >
              <option value="">Tüm Ligler</option>
              {(leaguesQuery.data?.data ?? []).map((league) => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
          </>
        }
        advancedFilters={
          <>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ sortBy: e.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF]"
            >
              <option value="name">Takım Adı</option>
              <option value="city">Şehir</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters({ sortOrder: e.target.value as "asc" | "desc" })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF]"
            >
              <option value="asc">A-Z</option>
              <option value="desc">Z-A</option>
            </select>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-[#9CA3AF]">
              <span className="font-semibold text-[#ECEDEF]">{totalTeams}</span> takım bulundu
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

      {/* Teams Grid */}
      <DataFeedback
        isLoading={teamsQuery.isLoading}
        error={teamsQuery.error as Error | undefined}
        isEmpty={teams.length === 0}
        emptyTitle="Takım bulunamadı"
        emptyDescription="Seçili filtrelerle takım listesi boş."
        onRetry={() => void teamsQuery.refetch()}
        loadingCount={6}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamCardWithForm key={team.id} team={team} />
          ))}
        </div>
      </DataFeedback>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <TeamsPageContent />
    </Suspense>
  );
}
