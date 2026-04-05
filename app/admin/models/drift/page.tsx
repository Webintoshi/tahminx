"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { EmptyState } from "@/components/states/EmptyState";
import { MetricCard } from "@/components/admin/MetricCard";
import { DriftSummaryCard } from "@/components/admin/DriftSummaryCard";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { ModelVersionSelect } from "@/components/admin/ModelVersionSelect";
import { SportLeagueFilters } from "@/components/admin/SportLeagueFilters";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useLeagues, useModelDriftSummary, useModelPerformanceTimeseries } from "@/lib/hooks/use-api";
import { formatDateTime } from "@/lib/utils";

const indicatorText = (value?: boolean | null) => {
  if (value === true) return "Izleme gerekli";
  if (value === false) return "Stabil";
  return "Veri yok";
};

function AdminModelDriftPageContent() {
  const { filters, setFilters } = useAdminQueryState("updatedAt");

  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const driftQuery = useModelDriftSummary({
    sport: filters.sport,
    leagueId: filters.leagueId || undefined,
    modelVersion: filters.modelVersion || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined
  });

  const performanceQuery = useModelPerformanceTimeseries({
    sport: filters.sport,
    leagueId: filters.leagueId || undefined,
    modelVersion: filters.modelVersion || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    pageSize: 200,
    sortBy: "timestamp",
    sortOrder: "desc"
  });

  const drift = driftQuery.data?.data;
  const points = performanceQuery.data?.data ?? [];
  const modelOptions = Array.from(
    new Set(points.map((item) => item.modelVersion).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Model Drift Summary"
        description="Son 7 gun ile onceki 30 gun performans degisimi"
      />

      <FilterPanel description="Sport, league, model version ve tarih araligi filtreleri">
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
      </FilterPanel>

      <DataFeedback
        isLoading={driftQuery.isLoading}
        error={driftQuery.error as Error | undefined}
        isEmpty={!drift}
        emptyTitle="Drift summary verisi yok"
        emptyDescription="Drift endpoint'i su an veri dondurmuyor."
        onRetry={() => {
          void driftQuery.refetch();
          void performanceQuery.refetch();
        }}
      >
        {drift ? (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                title="Performance Drop"
                value={indicatorText(drift.performanceDropDetected)}
                tone={drift.performanceDropDetected ? "warning" : "success"}
              />
              <MetricCard
                title="Confidence Drift"
                value={indicatorText(drift.confidenceDriftDetected)}
                tone={drift.confidenceDriftDetected ? "warning" : "success"}
              />
              <MetricCard
                title="Calibration Drift"
                value={indicatorText(drift.calibrationDriftDetected)}
                tone={drift.calibrationDriftDetected ? "warning" : "success"}
              />
            </section>

            <SectionCard title="Drift Summary Cards" subtitle="7 gun vs onceki 30 gun karsilastirma">
              {(drift.summaries ?? []).length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(drift.summaries ?? []).map((summary) => (
                    <DriftSummaryCard key={summary.metric} summary={summary} />
                  ))}
                </div>
              ) : (
                <EmptyState title="Drift detayi yok" description="Summaries listesi su an bos." />
              )}
            </SectionCard>

            <SectionCard title="Operasyon Notu" subtitle="Profesyonel izleme yorumu">
              <p className="text-sm text-[color:var(--muted)]">
                Drift sinyali kritik alarm anlamina gelmez. Bu panel, model davranisindaki degisimleri erken fark edip kalibrasyon ve veri kalite adimlarini planlamak icin kullanilir.
              </p>
              <p className="mt-2 text-xs text-[color:var(--muted)]">Guncelleme: {formatDateTime(drift.updatedAt)}</p>
            </SectionCard>
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}

export default function AdminModelDriftPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <AdminModelDriftPageContent />
    </Suspense>
  );
}
