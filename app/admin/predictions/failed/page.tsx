"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { MetricCard } from "@/components/admin/MetricCard";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { ModelVersionSelect } from "@/components/admin/ModelVersionSelect";
import { SportLeagueFilters } from "@/components/admin/SportLeagueFilters";
import { FailedPredictionTable } from "@/components/admin/FailedPredictionTable";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useFailedPredictions, useLeagues } from "@/lib/hooks/use-api";

function AdminFailedPredictionsPageContent() {
  const { filters, setFilters } = useAdminQueryState("updatedAt");

  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const failedQuery = useFailedPredictions({
    sport: filters.sport,
    leagueId: filters.leagueId || undefined,
    modelVersion: filters.modelVersion || undefined,
    onlyHighConfidenceFailed: filters.onlyHighConfidenceFailed,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });

  const rows = failedQuery.data?.data ?? [];
  const meta = failedQuery.data?.meta;

  const modelOptions = Array.from(
    new Set(rows.map((item) => item.modelVersion).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));

  const highConfidenceFailedCount = rows.filter((item) => (item.confidenceScore ?? 0) >= 75).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Failed Predictions"
        description="Yanlis tahmin listesi ve high-confidence yanlislarin analizi"
      />

      <FilterPanel
        description="Sport, league, model version, high-confidence ve tarih araligi filtreleri"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--muted)]">
              Sayfa {meta?.page ?? filters.page} / {meta?.totalPages ?? 1} - Toplam {meta?.total ?? rows.length}
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
        <SportLeagueFilters
          sport={filters.sport}
          leagueId={filters.leagueId}
          leagues={leaguesQuery.data?.data ?? []}
          onChange={(value) => setFilters(value)}
        />

        <ModelVersionSelect
          value={filters.modelVersion}
          options={modelOptions}
          onChange={(value) => setFilters({ modelVersion: value ?? "" })}
        />

        <DateRangeFilter from={filters.from} to={filters.to} onChange={(value) => setFilters(value)} />

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">High confidence yanlislar</span>
          <select
            value={filters.onlyHighConfidenceFailed === undefined ? "all" : filters.onlyHighConfidenceFailed ? "true" : "false"}
            onChange={(event) => {
              const value = event.target.value;
              setFilters({
                onlyHighConfidenceFailed: value === "all" ? undefined : value === "true"
              });
            }}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="all">Tum kayitlar</option>
            <option value="true">Sadece high confidence yanlislar</option>
            <option value="false">High confidence haric</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Sort by</span>
          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="updatedAt">Updated</option>
            <option value="confidenceScore">Confidence</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Sort order</span>
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
        isLoading={failedQuery.isLoading}
        error={failedQuery.error as Error | undefined}
        isEmpty={rows.length === 0}
        isPartial={rows.length > 0 && rows.length < 3}
        emptyTitle="Failed prediction kaydi bulunamadi"
        emptyDescription="Secili filtrelerde yanlis tahmin kaydi yok."
        partialTitle="Kismi failed prediction listesi"
        partialDescription="Kayit sayisi az oldugu icin trend yorumu kisitli olabilir."
        onRetry={() => void failedQuery.refetch()}
        loadingCount={6}
        loadingVariant="table"
      >
        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Toplam failed" value={String(meta?.total ?? rows.length)} />
          <MetricCard title="High confidence failed" value={String(highConfidenceFailedCount)} tone="warning" />
          <MetricCard title="Model varyasyonu" value={String(modelOptions.length)} />
        </section>

        <SectionCard title="Failed Prediction Tablosu" subtitle="Endpoint: /api/v1/admin/predictions/failed">
          <FailedPredictionTable rows={rows} />
        </SectionCard>
      </DataFeedback>
    </div>
  );
}

export default function AdminFailedPredictionsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <AdminFailedPredictionsPageContent />
    </Suspense>
  );
}
