"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { ComparisonTable } from "@/components/admin/ComparisonTable";
import { MetricCard } from "@/components/admin/MetricCard";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { ModelVersionSelect } from "@/components/admin/ModelVersionSelect";
import { SportLeagueFilters } from "@/components/admin/SportLeagueFilters";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useLeagues, useModelComparison } from "@/lib/hooks/use-api";

const BarChart = dynamic(() => import("@/components/charts/BarChart").then((mod) => mod.BarChart), {
  ssr: false,
  loading: () => <LoadingSkeleton className="h-52" />
});

const avg = (values: Array<number | null | undefined>) => {
  const valid = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, current) => sum + current, 0) / valid.length;
};

function AdminModelComparisonPageContent() {
  const { filters, setFilters } = useAdminQueryState("accuracy");

  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const comparisonQuery = useModelComparison({
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

  const rows = comparisonQuery.data?.data ?? [];
  const meta = comparisonQuery.data?.meta;

  const modelOptions = Array.from(new Set(rows.map((item) => item.modelVersion))).sort((a, b) => a.localeCompare(b));
  const accuracyAvg = avg(rows.map((item) => item.accuracy));
  const logLossAvg = avg(rows.map((item) => item.logLoss));
  const brierAvg = avg(rows.map((item) => item.brierScore));
  const confidenceAvg = avg(rows.map((item) => item.avgConfidenceScore));
  const calibrationAvg = avg(rows.map((item) => item.calibrationQuality));
  const sampleSizeTotal = rows.reduce((sum, item) => sum + (item.sampleSize ?? 0), 0);

  const chartData = rows.slice(0, 8).map((item) => ({
    label: `${item.modelVersion}${item.leagueName ? `-${item.leagueName}` : ""}`,
    value: item.accuracy ?? 0
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Model Comparison"
        description="Model versiyonlari, metrik kartlari ve karsilastirma tablosu"
      />

      <FilterPanel
        description="Sport, league, model version ve tarih araligi ile filtreleme"
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
          <span className="text-xs text-[color:var(--muted)]">Sort by</span>
          <select
            value={filters.sortBy}
            onChange={(event) => setFilters({ sortBy: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="accuracy">Accuracy</option>
            <option value="logLoss">LogLoss</option>
            <option value="brierScore">Brier Score</option>
            <option value="avgConfidenceScore">Avg Confidence</option>
            <option value="sampleSize">Sample Size</option>
            <option value="updatedAt">Updated</option>
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
        isLoading={comparisonQuery.isLoading}
        error={comparisonQuery.error as Error | undefined}
        isEmpty={rows.length === 0}
        isPartial={rows.length > 0 && rows.length < 2}
        emptyTitle="Model comparison verisi bulunamadi"
        emptyDescription="Secili filtrelerde model karsilastirma kaydi yok."
        partialTitle="Kisitli karsilastirma verisi"
        partialDescription="Karsilastirma sayisi az oldugu icin trend yorumunda ek dikkat onerilir."
        onRetry={() => void comparisonQuery.refetch()}
        loadingCount={6}
        loadingVariant="list"
      >
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="Accuracy" value={accuracyAvg == null ? "-" : `${accuracyAvg.toFixed(1)}%`} />
          <MetricCard title="LogLoss" value={logLossAvg == null ? "-" : logLossAvg.toFixed(3)} tone="warning" />
          <MetricCard title="Brier Score" value={brierAvg == null ? "-" : brierAvg.toFixed(3)} tone="warning" />
          <MetricCard title="Avg Confidence" value={confidenceAvg == null ? "-" : `${confidenceAvg.toFixed(1)}%`} />
          <MetricCard title="Calibration Quality" value={calibrationAvg == null ? "-" : `${calibrationAvg.toFixed(1)}%`} tone="success" />
          <MetricCard title="Sample Size" value={sampleSizeTotal.toString()} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Accuracy Karsilastirma Grafik" subtitle="Model ve lig bazli accuracy dagilimi">
            {chartData.length > 0 ? (
              <BarChart data={chartData} />
            ) : (
              <EmptyState title="Grafik verisi yok" description="Comparison kaydi olustugunda grafik burada gosterilir." />
            )}
          </SectionCard>

          <SectionCard title="Model Comparison Tablosu" subtitle="Endpoint: /api/v1/admin/models/comparison">
            <ComparisonTable rows={rows} />
          </SectionCard>
        </section>
      </DataFeedback>
    </div>
  );
}

export default function AdminModelComparisonPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <AdminModelComparisonPageContent />
    </Suspense>
  );
}
