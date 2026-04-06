"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SportTabs } from "@/components/filters/SportTabs";
import { PredictionCard } from "@/components/cards/PredictionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { useHighConfidencePredictions, useLeagues, usePredictions, useTeams } from "@/lib/hooks/use-api";
import { mapFiltersToPredictionQuery, useFilterQueryState } from "@/lib/hooks/use-query-state";

const riskOptions = [
  { value: "all", label: "Tum riskler" },
  { value: "low", label: "Dusuk" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yuksek" }
] as const;

function PredictionsPageContent() {
  const { filters, setFilters } = useFilterQueryState();
  const predictionQuery = usePredictions(mapFiltersToPredictionQuery(filters));
  const highConfidenceQuery = useHighConfidencePredictions();
  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const teamsQuery = useTeams({ sport: filters.sport, leagueId: filters.leagueId || undefined, pageSize: 200 });

  const allPredictions = predictionQuery.data?.data ?? [];
  const predictions =
    filters.riskLevel && filters.riskLevel !== "all"
      ? allPredictions.filter((item) => item.riskLevel === filters.riskLevel)
      : allPredictions;
  const highConfidence = highConfidenceQuery.data?.data ?? [];
  const meta = predictionQuery.data?.meta;

  const lowConfidenceCount = predictions.filter((item) => item.isLowConfidence || (item.confidenceScore ?? 0) < 67).length;
  const recommendedCount = predictions.filter((item) => item.isRecommended).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tahminler"
        description="Calibrated confidence score, risk flags ve low-confidence ayrimi"
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Toplam</p>
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">{meta?.total ?? predictions.length}</p>
        </article>
        <article className="rounded-xl border border-teal-500/35 bg-[color:var(--surface)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Onerilen</p>
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">{recommendedCount}</p>
        </article>
        <article className="rounded-xl border border-amber-500/35 bg-[color:var(--surface)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Dusuk guven</p>
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">{lowConfidenceCount}</p>
        </article>
      </section>

      <FilterPanel
        description="Risk ve confidence odakli filtreler URL query param ile senkron calisir."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--muted)]">
              Sayfa {meta?.page ?? filters.page} / {meta?.totalPages ?? 1} - Toplam {filters.riskLevel !== "all" ? predictions.length : meta?.total ?? predictions.length}
            </p>
            <div className="flex gap-2">
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
          <span className="text-xs text-[color:var(--muted)]">Risk</span>
          <select
            value={filters.riskLevel}
            onChange={(event) => setFilters({ riskLevel: event.target.value, status: undefined, page: 1 })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            {riskOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
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

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Dusuk guven filtresi</span>
          <select
            value={filters.isLowConfidence === undefined ? "all" : filters.isLowConfidence ? "true" : "false"}
            onChange={(event) => {
              const value = event.target.value;
              setFilters({ isLowConfidence: value === "all" ? undefined : value === "true" });
            }}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="all">Tum kayitlar</option>
            <option value="true">Sadece dusuk guven</option>
            <option value="false">Dusuk guven haric</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Onerilen filtresi</span>
          <select
            value={filters.isRecommended === undefined ? "all" : filters.isRecommended ? "true" : "false"}
            onChange={(event) => {
              const value = event.target.value;
              setFilters({ isRecommended: value === "all" ? undefined : value === "true" });
            }}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="all">Tum kayitlar</option>
            <option value="true">Sadece onerilen</option>
            <option value="false">Onerilen haric</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Siralama alani</span>
          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="confidenceScore">Guven skoru</option>
            <option value="kickoffAt">Tarih</option>
            <option value="riskLevel">Risk seviyesi</option>
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
        isLoading={predictionQuery.isLoading}
        error={predictionQuery.error as Error | undefined}
        isEmpty={predictions.length === 0}
        isPartial={predictions.length > 0 && predictions.length < 3}
        emptyTitle="Tahmin bulunamadi"
        emptyDescription="Secili filtrelerde tahmin listesi bos."
        partialTitle="Dusuk veri kapsami"
        partialDescription="Filtrelere uyan tahmin sayisi az oldugu icin gosterim kisitli olabilir."
        onRetry={() => void predictionQuery.refetch()}
        loadingCount={8}
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {predictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))}
        </div>

        {highConfidence.length > 0 ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <h2 className="text-lg [font-family:var(--font-display)]">Yuksek Guven Skorlu Tahminler</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Ek kontrol listesi</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {highConfidence.slice(0, 2).map((prediction) => (
                <PredictionCard key={`high-${prediction.id}`} prediction={prediction} />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState title="Yuksek guven listesi bos" description="High-confidence endpoint su an kayit dondurmuyor." />
        )}
      </DataFeedback>
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <PredictionsPageContent />
    </Suspense>
  );
}
