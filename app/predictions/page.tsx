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
import { cn } from "@/lib/utils";

const riskOptions = [
  { value: "all", label: "Tüm Riskler" },
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" }
] as const;

// Stats Card Component
function StatCard({ 
  label, 
  count, 
  icon, 
  color = "default"
}: { 
  label: string; 
  count: number; 
  icon: React.ReactNode;
  color?: "default" | "success" | "warning";
}) {
  return (
    <div className={cn(
      "group flex items-center gap-3 rounded-xl border p-4 transition-all duration-300",
      color === "success"
        ? "border-[#34C759]/30 bg-[#34C759]/5"
        : color === "warning"
        ? "border-[#FF9500]/30 bg-[#FF9500]/5"
        : "border-[#2A3035] bg-[#171C1F]"
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        color === "success"
          ? "bg-[#34C759] text-black"
          : color === "warning"
          ? "bg-[#FF9500] text-black"
          : "bg-[#1F2529] text-[#9CA3AF]"
      )}>
        {icon}
      </div>
      <div>
        <p className={cn(
          "text-2xl font-bold transition-colors",
          color === "success" ? "text-[#34C759]" : color === "warning" ? "text-[#FF9500]" : "text-[#ECEDEF]"
        )}>
          {count}
        </p>
        <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
      </div>
    </div>
  );
}

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

  const currentPage = meta?.page ?? filters.page;
  const totalPages = meta?.totalPages ?? 1;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tahminler"
        description="AI tahminleri, güven skorları ve risk analizi"
      />

      {/* Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Toplam Tahmin"
          count={meta?.total ?? predictions.length}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Önerilen"
          count={recommendedCount}
          color="success"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatCard
          label="Düşük Güven"
          count={lowConfidenceCount}
          color="warning"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </section>

      {/* Filters */}
      <FilterPanel
        primaryFilters={
          <>
            <SportTabs 
              value={filters.sport as "all" | "football" | "basketball"} 
              onChange={(value) => setFilters({ sport: value })} 
            />

            <select
              value={filters.riskLevel}
              onChange={(event) => setFilters({ riskLevel: event.target.value, status: undefined, page: 1 })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              {riskOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={filters.minConfidence ?? ""}
              onChange={(event) => setFilters({ minConfidence: event.target.value === "" ? undefined : Number(event.target.value) })}
              className="h-11 w-32 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] placeholder:text-[#9CA3AF] focus:border-[#7A84FF] focus:outline-none"
              placeholder="Min güven %"
            />
          </>
        }
        advancedFilters={
          <>
            <select
              value={filters.leagueId}
              onChange={(event) => setFilters({ leagueId: event.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="">Tüm ligler</option>
              {(leaguesQuery.data?.data ?? []).map((league) => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>

            <select
              value={filters.teamId}
              onChange={(event) => setFilters({ teamId: event.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="">Tüm takımlar</option>
              {(teamsQuery.data?.data ?? []).map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            <select
              value={filters.isLowConfidence === undefined ? "all" : filters.isLowConfidence ? "true" : "false"}
              onChange={(event) => {
                const value = event.target.value;
                setFilters({ isLowConfidence: value === "all" ? undefined : value === "true" });
              }}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="all">Tüm kayıtlar</option>
              <option value="true">Sadece düşük güven</option>
              <option value="false">Düşük güven hariç</option>
            </select>

            <select
              value={filters.isRecommended === undefined ? "all" : filters.isRecommended ? "true" : "false"}
              onChange={(event) => {
                const value = event.target.value;
                setFilters({ isRecommended: value === "all" ? undefined : value === "true" });
              }}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="all">Tüm kayıtlar</option>
              <option value="true">Sadece önerilen</option>
              <option value="false">Önerilen hariç</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(event) => setFilters({ sortBy: event.target.value })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="confidenceScore">Güven skoruna göre</option>
              <option value="kickoffAt">Tarihe göre</option>
              <option value="riskLevel">Risk seviyesine göre</option>
            </select>

            <select
              value={filters.sortOrder}
              onChange={(event) => setFilters({ sortOrder: event.target.value as "asc" | "desc" })}
              className="h-11 rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="desc">Önce yüksek</option>
              <option value="asc">Önce düşük</option>
            </select>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
              <span className="rounded-lg bg-[#1F2529] px-3 py-1.5 font-semibold text-[#ECEDEF]">
                {meta?.total ?? predictions.length}
              </span>
              <span>tahmin</span>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilters({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3035] bg-[#1F2529] text-sm font-medium text-[#ECEDEF] transition-colors hover:border-[#7A84FF] hover:text-[#7A84FF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {getPageNumbers().map((page, idx) => (
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-[#9CA3AF]">...</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setFilters({ page: page as number })}
                    className={cn(
                      "h-9 min-w-[2.25rem] rounded-lg px-3 text-sm font-semibold transition-all",
                      currentPage === page
                        ? "bg-[#7A84FF] text-black"
                        : "border border-[#2A3035] bg-[#1F2529] text-[#ECEDEF] hover:border-[#7A84FF] hover:text-[#7A84FF]"
                    )}
                  >
                    {page}
                  </button>
                )
              ))}
              
              <button
                type="button"
                onClick={() => setFilters({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3035] bg-[#1F2529] text-sm font-medium text-[#ECEDEF] transition-colors hover:border-[#7A84FF] hover:text-[#7A84FF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        }
      />

      {/* Results */}
      <DataFeedback
        isLoading={predictionQuery.isLoading}
        error={predictionQuery.error as Error | undefined}
        isEmpty={predictions.length === 0}
        isPartial={predictions.length > 0 && predictions.length < 3}
        emptyTitle="Tahmin bulunamadı"
        emptyDescription="Seçili filtrelerde tahmin listesi boş."
        partialTitle="Düşük veri kapsamı"
        partialDescription="Filtrelere uyan tahmin sayısı az olduğu için gösterim kısıtlı olabilir."
        onRetry={() => void predictionQuery.refetch()}
        loadingCount={6}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {predictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))}
        </div>

        {highConfidence.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A84FF]">
                <svg className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#ECEDEF]">Yüksek Güven Skorlu Tahminler</h2>
                <p className="text-xs text-[#9CA3AF]">Ek kontrol listesi</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {highConfidence.slice(0, 2).map((prediction) => (
                <PredictionCard key={`high-${prediction.id}`} prediction={prediction} />
              ))}
            </div>
          </section>
        ) : null}
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
