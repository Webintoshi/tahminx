"use client";

import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { SportLeagueFilters } from "@/components/admin/SportLeagueFilters";
import { ModelSelector } from "@/components/admin/ModelSelector";
import { EnsembleWeightEditor } from "@/components/admin/EnsembleWeightEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/providers/ToastProvider";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useEnsembleConfigs, useLeagues, useUpdateEnsembleConfig } from "@/lib/hooks/use-api";
import type { EnsembleConfig, EnsembleWeight } from "@/types/api-contract";

function EnsemblePageContent() {
  const { filters, setFilters } = useAdminQueryState("updatedAt");
  const { showToast } = useToast();

  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const ensembleQuery = useEnsembleConfigs({
    sport: filters.sport,
    leagueId: filters.leagueId || undefined,
    modelVersion: filters.modelVersion || undefined,
    isActive: filters.isActive,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });
  const updateMutation = useUpdateEnsembleConfig();

  const rows = useMemo(() => ensembleQuery.data?.data ?? [], [ensembleQuery.data?.data]);
  const meta = ensembleQuery.data?.meta;

  const modelOptions = useMemo(
    () => Array.from(new Set(rows.map((item) => item.modelVersion).filter((value): value is string => Boolean(value)))),
    [rows]
  );

  const [drafts, setDrafts] = useState<Record<string, EnsembleWeight[]>>({});
  const [confirmConfigId, setConfirmConfigId] = useState<string | null>(null);

  const setWeight = (configId: string, fallback: EnsembleWeight[], model: string, value: number) => {
    setDrafts((current) => ({
      ...current,
      [configId]: (current[configId] ?? fallback).map((item) =>
        item.model === model ? { ...item, weight: Number.isFinite(value) ? value : item.weight } : item
      )
    }));
  };

  const normalizeWeights = (configId: string, fallback: EnsembleWeight[]) => {
    setDrafts((current) => {
      const row = current[configId] ?? fallback;
      const total = row.reduce((sum, item) => sum + item.weight, 0);
      if (total <= 0) return current;
      return {
        ...current,
        [configId]: row.map((item) => ({ ...item, weight: Number((item.weight / total).toFixed(4)) }))
      };
    });
  };

  const saveConfig = (config: EnsembleConfig) => {
    const weights = drafts[config.id] ?? config.weights;
    updateMutation.mutate(
      {
        configId: config.id,
        data: { weights, isActive: config.isActive ?? true }
      },
      {
        onSuccess: () => {
          showToast({ tone: "success", title: "Ensemble config guncellendi" });
          setConfirmConfigId(null);
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Kayit basarisiz",
            description: error instanceof Error ? error.message : "Bilinmeyen hata"
          });
          setConfirmConfigId(null);
        }
      }
    );
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Ensemble Config Panel"
        description="Model agirliklari, normalize kontrolu ve kaydetme islemleri"
      />

      <FilterPanel
        primaryFilters={
          <>
            <SportLeagueFilters
              sport={filters.sport}
              leagueId={filters.leagueId}
              leagues={leaguesQuery.data?.data ?? []}
              onChange={(value) => setFilters(value)}
            />

            <ModelSelector
              value={filters.modelVersion}
              options={modelOptions}
              onChange={(value) => setFilters({ modelVersion: value })}
            />

            <select
              value={filters.isActive === undefined ? "all" : filters.isActive ? "true" : "false"}
              onChange={(event) => {
                const value = event.target.value;
                setFilters({ isActive: value === "all" ? undefined : value === "true" });
              }}
              className="h-11 w-full rounded-xl border border-[#2A3035] bg-[#1F2529] px-4 text-sm text-[#ECEDEF] focus:border-[#7A84FF] focus:outline-none"
            >
              <option value="all">Tüm kayitlar</option>
              <option value="true">Sadece active</option>
              <option value="false">Sadece inactive</option>
            </select>
          </>
        }
        advancedFilters={<></>}
      />

      <SectionCard title="Ensemble Config List" subtitle={`Toplam ${meta?.total ?? rows.length} kayit`}>
        <DataFeedback
          isLoading={ensembleQuery.isLoading}
          error={ensembleQuery.error as Error | undefined}
          isEmpty={rows.length === 0}
          emptyTitle="Ensemble config verisi bulunamadi"
          emptyDescription="Config endpoint'i secili filtrelerde veri dondurmuyor."
          onRetry={() => void ensembleQuery.refetch()}
          loadingVariant="list"
          loadingCount={4}
        >
          <div className="space-y-4">
            {rows.map((config) => {
              const draft = drafts[config.id] ?? config.weights;
              const total = draft.reduce((sum, item) => sum + item.weight, 0);

              return (
                <div key={config.id} className="space-y-2">
                  <EnsembleWeightEditor
                    config={config}
                    draft={draft}
                    saving={updateMutation.isPending && updateMutation.variables?.configId === config.id}
                    onChange={(model, weight) => setWeight(config.id, config.weights, model, weight)}
                    onNormalize={() => normalizeWeights(config.id, config.weights)}
                    onSave={() => setConfirmConfigId(config.id)}
                  />

                  {Math.abs(total - 1) > 0.001 ? (
                    <EmptyState
                      tone="warning"
                      title="Weight Uyarisi"
                      description="Toplam agirlik 1.0 degil. Normalize islemi yapmadan kaydetmek canli tahmin dengesini bozabilir."
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </DataFeedback>
      </SectionCard>

      <ConfirmDialog
        open={Boolean(confirmConfigId)}
        title="Ensemble config guncellenecek"
        description="Agirlik degisiklikleri model ciktilarini etkileyecektir. Kaydetmek istiyor musunuz?"
        isProcessing={updateMutation.isPending}
        onCancel={() => setConfirmConfigId(null)}
        onConfirm={() => {
          const config = rows.find((item) => item.id === confirmConfigId);
          if (!config) {
            setConfirmConfigId(null);
            return;
          }
          saveConfig(config);
        }}
      />
    </div>
  );
}

export default function EnsemblePage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <EnsemblePageContent />
    </Suspense>
  );
}
