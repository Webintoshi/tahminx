"use client";

import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamFormCard } from "@/components/cards/TeamFormCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { SportTabs } from "@/components/filters/SportTabs";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useLeagues, useTeamForm, useTeams } from "@/lib/hooks/use-api";
import { mapFiltersToMatchQuery, useFilterQueryState } from "@/lib/hooks/use-query-state";
import type { TeamListItem } from "@/types/api-contract";

function TeamCardWithForm({ team }: { team: TeamListItem }) {
  const formQuery = useTeamForm(team.id);

  return (
    <div className="space-y-2">
      <TeamFormCard team={team} form={formQuery.data?.data ?? []} />
      <Link href={`/teams/${team.id}`} className="inline-flex text-sm font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-2)]">
        Takim detay
      </Link>
    </div>
  );
}

function TeamsPageContent() {
  const { filters, setFilters } = useFilterQueryState();
  const teamsQuery = useTeams(mapFiltersToMatchQuery(filters));
  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });

  const teams = teamsQuery.data?.data ?? [];
  const meta = teamsQuery.data?.meta;

  return (
    <div className="space-y-5">
      <PageHeader title="Takimlar" description="Takim listesi, profil metrikleri ve form odakli gorunum" />

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
        <SportTabs value={filters.sport as "all" | "football" | "basketball"} onChange={(value) => setFilters({ sport: value })} />

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Lig</span>
          <select
            value={filters.leagueId}
            onChange={(event) => setFilters({ leagueId: event.target.value })}
            className="h-10 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="">Tum ligler</option>
            {(leaguesQuery.data?.data ?? []).map((league) => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Siralama</span>
          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
            className="h-10 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="name">Takim adi</option>
            <option value="city">Sehir</option>
          </select>
        </label>
      </section>

      <DataFeedback
        isLoading={teamsQuery.isLoading}
        error={teamsQuery.error as Error | undefined}
        isEmpty={teams.length === 0}
        emptyTitle="Takim bulunamadi"
        emptyDescription="Secili filtrelerle takim listesi bos."
        onRetry={() => void teamsQuery.refetch()}
      >
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamCardWithForm key={team.id} team={team} />
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
          <p>Sayfa {meta?.page ?? filters.page} / {meta?.totalPages ?? 1}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] px-3 py-1"
              disabled={filters.page <= 1}
              onClick={() => setFilters({ page: Math.max(1, filters.page - 1) })}
            >
              Onceki
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] px-3 py-1"
              disabled={meta ? filters.page >= meta.totalPages : false}
              onClick={() => setFilters({ page: filters.page + 1 })}
            >
              Sonraki
            </button>
          </div>
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
