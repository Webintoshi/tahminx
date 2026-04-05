"use client";

import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SportTabs } from "@/components/filters/SportTabs";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useLeagues } from "@/lib/hooks/use-api";
import { mapFiltersToMatchQuery, useFilterQueryState } from "@/lib/hooks/use-query-state";

function LeaguesPageContent() {
  const { filters, setFilters } = useFilterQueryState();
  const leaguesQuery = useLeagues(mapFiltersToMatchQuery(filters));
  const leagues = leaguesQuery.data?.data ?? [];
  const meta = leaguesQuery.data?.meta;

  return (
    <div className="space-y-5">
      <PageHeader title="Ligler" description="Futbol ve basketbol lig listesi, detay, puan tablosu ve performans gorunumu" />

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
        <SportTabs value={filters.sport as "all" | "football" | "basketball"} onChange={(value) => setFilters({ sport: value })} />

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Siralama</span>
          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
            className="h-10 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="updatedAt">Guncellenme</option>
            <option value="name">Lig adi</option>
            <option value="country">Ulke</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Yon</span>
          <select
            value={filters.sortOrder}
            onChange={(event) => setFilters({ sortOrder: event.target.value as "asc" | "desc" })}
            className="h-10 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="desc">Azalan</option>
            <option value="asc">Artan</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Sayfa boyutu</span>
          <select
            value={filters.pageSize}
            onChange={(event) => setFilters({ pageSize: Number(event.target.value), page: 1 })}
            className="h-10 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </section>

      <DataFeedback
        isLoading={leaguesQuery.isLoading}
        error={leaguesQuery.error as Error | undefined}
        isEmpty={leagues.length === 0}
        emptyTitle="Lig bulunamadi"
        emptyDescription="Secili filtrelere uygun lig verisi yok."
        onRetry={() => void leaguesQuery.refetch()}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {leagues.map((league) => (
            <article key={league.id} className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">{league.country}</p>
              <h3 className="mt-1 text-xl text-[color:var(--foreground)] [font-family:var(--font-display)]">{league.name}</h3>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Sezon {league.season}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Son update: {league.updatedAt ?? "-"}</p>
              <Link href={`/leagues/${league.id}`} className="mt-3 inline-flex text-sm font-semibold text-[color:var(--accent)] hover:text-[color:var(--accent-2)]">
                Lig detayina git
              </Link>
            </article>
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

export default function LeaguesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <LeaguesPageContent />
    </Suspense>
  );
}
