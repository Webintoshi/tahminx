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
    <div className="space-y-6 p-6">
      <PageHeader
        title="Feature Importance"
        description="Top contributing feature listesi ve importance skor dagilimi"
      />

      <FilterPanel
        primaryFilters={
          <>
            <select
              value={filters.sport}
              onChange={(event) => setFilters({ sport: event.target.value as "all" | "football" | "basketball" })}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="all">Tüm sporlar</option>
              <option value="football">Futbol</option>
              <option value="basketball">Basketbol</option>
            </select>

            <ModelVersionSelect
              value={filters.modelVersion}
              options={modelOptions}
              onChange={(value) => setFilters({ modelVersion: value ?? "" })}
            />
          </>
        }
        advancedFilters={
          <>
            <DateRangeFilter from={filters.from} to={filters.to} onChange={(value) => setFilters(value)} />

            <select
              value={filters.sortBy}
              onChange={(event) => setFilters({ sortBy: event.target.value })}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="updatedAt">Updated</option>
              <option value="modelVersion">Model version</option>
            </select>

            <select
              value={filters.sortOrder}
              onChange={(event) => setFilters({ sortOrder: event.target.value as "asc" | "desc" })}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </>
        }
      />

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
            <div className="grid gap-4 lg:grid-cols-2">
              {footballRows.map((item) => (
                <article key={`${item.modelVersion}-${item.updatedAt ?? "na"}`} className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#ECEDEF]">{item.modelVersion}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatDateTime(item.updatedAt)}</p>
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
            <div className="grid gap-4 lg:grid-cols-2">
              {basketballRows.map((item) => (
                <article key={`${item.modelVersion}-${item.updatedAt ?? "na"}`} className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#ECEDEF]">{item.modelVersion}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatDateTime(item.updatedAt)}</p>
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
