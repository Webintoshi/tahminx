"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { ModelVersionSelect } from "@/components/admin/ModelVersionSelect";
import { FeatureImportanceChart } from "@/components/admin/FeatureImportanceChart";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useFeatureImportance } from "@/lib/hooks/use-api";
import { formatDateTime } from "@/lib/utils";

function AdminFeatureImportancePageContent() {
  const { filters, setFilters } = useAdminQueryState("updatedAt");

  const featureQuery = useFeatureImportance({
    sport: filters.sport,
    modelVersion: filters.modelVersion || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });

  const rows = featureQuery.data?.data ?? [];
  const footballRows = rows.filter((row) => row.sportKey === "football");
  const basketballRows = rows.filter((row) => row.sportKey === "basketball");
  const modelOptions = Array.from(new Set(rows.map((row) => row.modelVersion))).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Feature Importance"
        description="Top contributing feature listesi ve importance skor dagilimi"
      />

      <FilterPanel description="Sport, model version ve tarih araligi filtreleri">
        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Spor</span>
          <select
            value={filters.sport}
            onChange={(event) => setFilters({ sport: event.target.value as "all" | "football" | "basketball" })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="all">Tum sporlar</option>
            <option value="football">Futbol</option>
            <option value="basketball">Basketbol</option>
          </select>
        </label>

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
            <option value="updatedAt">Updated</option>
            <option value="modelVersion">Model version</option>
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
        isLoading={featureQuery.isLoading}
        error={featureQuery.error as Error | undefined}
        isEmpty={rows.length === 0}
        emptyTitle="Feature importance kaydi bulunamadi"
        emptyDescription="Secili filtrelerde endpoint veri dondurmuyor."
        onRetry={() => void featureQuery.refetch()}
        loadingCount={6}
        loadingVariant="list"
      >
        <SectionCard title="Futbol" subtitle="Football model feature katkisi">
          {footballRows.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {footballRows.map((item) => (
                <article key={`${item.modelVersion}-${item.updatedAt ?? "na"}`} className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[color:var(--foreground)]">{item.modelVersion}</p>
                    <p className="text-xs text-[color:var(--muted)]">{formatDateTime(item.updatedAt)}</p>
                  </div>
                  <FeatureImportanceChart items={item.features.slice(0, 8)} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Futbol verisi yok" description="Futbol segmenti icin feature importance kaydi yok." />
          )}
        </SectionCard>

        <SectionCard title="Basketbol" subtitle="Basketball model feature katkisi">
          {basketballRows.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {basketballRows.map((item) => (
                <article key={`${item.modelVersion}-${item.updatedAt ?? "na"}`} className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[color:var(--foreground)]">{item.modelVersion}</p>
                    <p className="text-xs text-[color:var(--muted)]">{formatDateTime(item.updatedAt)}</p>
                  </div>
                  <FeatureImportanceChart items={item.features.slice(0, 8)} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Basketbol verisi yok" description="Basketbol segmenti icin feature importance kaydi yok." />
          )}
        </SectionCard>
      </DataFeedback>
    </div>
  );
}

export default function AdminFeatureImportancePage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <AdminFeatureImportancePageContent />
    </Suspense>
  );
}
