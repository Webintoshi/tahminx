"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { DataFeedback } from "@/components/states/DataFeedback";
import { SectionCard } from "@/components/ui/SectionCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { PerformanceTrendChart } from "@/components/admin/PerformanceTrendChart";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { ModelVersionSelect } from "@/components/admin/ModelVersionSelect";
import { SportLeagueFilters } from "@/components/admin/SportLeagueFilters";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useLeagues, useModelPerformanceTimeseries } from "@/lib/hooks/use-api";

function AdminModelPerformancePageContent() {
  const { filters, setFilters } = useAdminQueryState("timestamp");

  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const performanceQuery = useModelPerformanceTimeseries({
    sport: filters.sport,
    leagueId: filters.leagueId || undefined,
    modelVersion: filters.modelVersion || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });

  const points = performanceQuery.data?.data ?? [];
  const meta = performanceQuery.data?.meta;

  const modelOptions = Array.from(
    new Set(points.map((item) => item.modelVersion).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));

  const latest = [...points]
    .filter((point) => point.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Model Performance Timeseries"
        description="Accuracy, logLoss, brier score ve confidence trend analizi"
      />

      <FilterPanel
        description="Sport, league, model ve tarih araligi filtreleri"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--muted)]">
              Sayfa {meta?.page ?? filters.page} / {meta?.totalPages ?? 1} - Toplam {meta?.total ?? points.length}
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
          <span className="text-xs text-[color:var(--muted)]">Sort by</span>
          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="timestamp">Timestamp</option>
            <option value="accuracy">Accuracy</option>
            <option value="logLoss">LogLoss</option>
            <option value="brierScore">Brier Score</option>
            <option value="avgConfidenceScore">Avg Confidence</option>
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
        isLoading={performanceQuery.isLoading}
        error={performanceQuery.error as Error | undefined}
        isEmpty={points.length === 0}
        emptyTitle="Performance timeseries verisi yok"
        emptyDescription="Secili filtrelerde performans serisi bulunamadi."
        onRetry={() => void performanceQuery.refetch()}
        loadingCount={6}
        loadingVariant="list"
      >
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Latest Accuracy" value={latest?.accuracy == null ? "-" : `${latest.accuracy.toFixed(1)}%`} />
          <MetricCard title="Latest LogLoss" value={latest?.logLoss == null ? "-" : latest.logLoss.toFixed(3)} tone="warning" />
          <MetricCard title="Latest Brier" value={latest?.brierScore == null ? "-" : latest.brierScore.toFixed(3)} tone="warning" />
          <MetricCard
            title="Latest Avg Confidence"
            value={latest?.avgConfidenceScore == null ? "-" : `${latest.avgConfidenceScore.toFixed(1)}%`}
            tone="success"
          />
        </section>

        <SectionCard title="Performance Trend Charts" subtitle="Metrik bazli zaman serisi gosterimi">
          {points.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              <PerformanceTrendChart points={points} metric="accuracy" title="Accuracy Trend" />
              <PerformanceTrendChart points={points} metric="logLoss" title="LogLoss Trend" />
              <PerformanceTrendChart points={points} metric="brierScore" title="Brier Score Trend" />
              <PerformanceTrendChart points={points} metric="avgConfidenceScore" title="Avg Confidence Trend" />
            </div>
          ) : (
            <EmptyState title="Trend verisi yok" description="Performance point kaydi geldikce grafikler otomatik dolacak." />
          )}
        </SectionCard>
      </DataFeedback>
    </div>
  );
}

export default function AdminModelPerformancePage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <AdminModelPerformancePageContent />
    </Suspense>
  );
}
