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

const statusOptions = [
  { value: "all", label: "Tum durumlar" },
  { value: "scheduled", label: "Planlandi" },
  { value: "live", label: "Canli" },
  { value: "completed", label: "Tamamlandi" },
  { value: "postponed", label: "Ertelendi" },
  { value: "cancelled", label: "Iptal" }
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maclar"
        description="Bugun, yarin, haftalik fikstur, canli ve tamamlanan maclar. Filtreler URL ile senkronizedir."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Bugun</p>
          <p className="text-2xl font-semibold">{todayQuery.data?.data.length ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Yarin</p>
          <p className="text-2xl font-semibold">{tomorrowQuery.data?.data.length ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Canli</p>
          <p className="text-2xl font-semibold">{liveQuery.data?.data.length ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Tamamlanan</p>
          <p className="text-2xl font-semibold">{completedQuery.data?.data.length ?? 0}</p>
        </article>
      </section>

      <FilterPanel
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--muted)]">
              Sayfa {meta?.page ?? filters.page} / {meta?.totalPages ?? 1} • Toplam {meta?.total ?? matches.length} kayit
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilters({ page: Math.max(1, filters.page - 1) })}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                disabled={filters.page <= 1}
              >
                Onceki
              </button>
              <button
                type="button"
                onClick={() => setFilters({ page: filters.page + 1 })}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                disabled={meta ? filters.page >= meta.totalPages : false}
              >
                Sonraki
              </button>
            </div>
          </div>
        }
      >
        <SportTabs value={filters.sport as "all" | "football" | "basketball"} onChange={(value) => setFilters({ sport: value })} />

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Lig</span>
          <select
            value={filters.leagueId}
            onChange={(event) => setFilters({ leagueId: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="">Tum ligler</option>
            {(leaguesQuery.data?.data ?? []).map((league) => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Takim</span>
          <select
            value={filters.teamId}
            onChange={(event) => setFilters({ teamId: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="">Tum takimlar</option>
            {(teamsQuery.data?.data ?? []).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Durum</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters({ status: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Tarih</span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters({ date: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Baslangic</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters({ from: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Bitis</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters({ to: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Min guven</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={filters.minConfidence ?? ""}
            onChange={(event) => setFilters({ minConfidence: event.target.value === "" ? undefined : Number(event.target.value) })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
            placeholder="0-100"
          />
        </label>

        <SearchInput value={filters.teamId} onChange={(value) => setFilters({ teamId: value })} placeholder="teamId ile ara" />

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Sayfa boyutu</span>
          <select
            value={filters.pageSize}
            onChange={(event) => setFilters({ pageSize: Number(event.target.value), page: 1 })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Siralama alani</span>
          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="kickoffAt">Tarih</option>
            <option value="confidenceScore">Guven skoru</option>
            <option value="status">Durum</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Siralama yonu</span>
          <select
            value={filters.sortOrder}
            onChange={(event) => setFilters({ sortOrder: event.target.value as "asc" | "desc" })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="desc">Azalan</option>
            <option value="asc">Artan</option>
          </select>
        </label>
      </FilterPanel>

      <DataFeedback
        isLoading={matchesQuery.isLoading}
        error={matchesQuery.error as Error | undefined}
        isEmpty={matches.length === 0}
        emptyTitle="Mac bulunamadi"
        emptyDescription="Secili filtrelere uygun mac kaydi bulunmuyor."
        onRetry={() => void matchesQuery.refetch()}
        loadingCount={8}
      >
        <div className="grid gap-3 xl:grid-cols-2">
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
