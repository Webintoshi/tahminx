"use client";

import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { SportLeagueFilters } from "@/components/admin/SportLeagueFilters";
import { StrategyTable } from "@/components/admin/StrategyTable";
import { MetricCard } from "@/components/admin/MetricCard";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/providers/ToastProvider";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import { useAutoSelectStrategyMutation, useLeagues, useModelStrategies, useUpdateStrategyMutation } from "@/lib/hooks/use-api";
import type { ModelStrategy } from "@/types/api-contract";

type ConfirmState =
  | { type: "auto-select" }
  | { type: "toggle"; strategy: ModelStrategy; nextActive: boolean }
  | { type: "save-edit"; strategyId: string; primaryModel: string; fallbackModel: string; isActive: boolean }
  | null;

function StrategiesPageContent() {
  const { filters, setFilters } = useAdminQueryState("updatedAt");
  const { showToast } = useToast();

  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const strategiesQuery = useModelStrategies({
    sport: filters.sport,
    leagueId: filters.leagueId || undefined,
    predictionType: filters.predictionType || undefined,
    isActive: filters.isActive,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });

  const autoSelectMutation = useAutoSelectStrategyMutation();
  const updateMutation = useUpdateStrategyMutation();

  const [editing, setEditing] = useState<ModelStrategy | null>(null);
  const [editPrimaryModel, setEditPrimaryModel] = useState("");
  const [editFallbackModel, setEditFallbackModel] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const rows = useMemo(() => strategiesQuery.data?.data ?? [], [strategiesQuery.data?.data]);
  const meta = strategiesQuery.data?.meta;

  const predictionTypes = useMemo(
    () => Array.from(new Set(rows.map((item) => item.predictionType))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const activeCount = rows.filter((item) => item.isActive).length;
  const inactiveCount = rows.length - activeCount;

  const openEditModal = (item: ModelStrategy) => {
    setEditing(item);
    setEditPrimaryModel(item.primaryModel);
    setEditFallbackModel(item.fallbackModel ?? "");
    setEditActive(item.isActive);
  };

  const handleConfirm = async () => {
    if (!confirmState) return;

    if (confirmState.type === "auto-select") {
      autoSelectMutation.mutate(undefined, {
        onSuccess: (response) => {
          showToast({
            tone: "success",
            title: "Auto-select tamamlandi",
            description: response.data.note ?? "Model strategy secimi guncellendi."
          });
          setConfirmState(null);
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Auto-select basarisiz",
            description: error instanceof Error ? error.message : "Bilinmeyen hata"
          });
          setConfirmState(null);
        }
      });
      return;
    }

    if (confirmState.type === "toggle") {
      updateMutation.mutate(
        {
          strategyId: confirmState.strategy.id,
          data: {
            primaryModel: confirmState.strategy.primaryModel,
            fallbackModel: confirmState.strategy.fallbackModel ?? "",
            isActive: confirmState.nextActive
          }
        },
        {
          onSuccess: () => {
            showToast({ tone: "success", title: "Strategy guncellendi" });
            setConfirmState(null);
          },
          onError: (error) => {
            showToast({
              tone: "error",
              title: "Guncelleme basarisiz",
              description: error instanceof Error ? error.message : "Bilinmeyen hata"
            });
            setConfirmState(null);
          }
        }
      );
      return;
    }

    updateMutation.mutate(
      {
        strategyId: confirmState.strategyId,
        data: {
          primaryModel: confirmState.primaryModel,
          fallbackModel: confirmState.fallbackModel,
          isActive: confirmState.isActive
        }
      },
      {
        onSuccess: () => {
          showToast({ tone: "success", title: "Strategy kaydedildi" });
          setEditing(null);
          setConfirmState(null);
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Kayit basarisiz",
            description: error instanceof Error ? error.message : "Bilinmeyen hata"
          });
          setConfirmState(null);
        }
      }
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Model Strategies"
        description="Primary/fallback model secimi, prediction type ve aktiflik yonetimi"
        actions={
          <button
            type="button"
            onClick={() => setConfirmState({ type: "auto-select" })}
            className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2 text-sm font-semibold"
            disabled={autoSelectMutation.isPending}
          >
            {autoSelectMutation.isPending ? "Calisiyor..." : "Auto-select"}
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Toplam Strategy" value={String(meta?.total ?? rows.length)} />
        <MetricCard title="Active" value={String(activeCount)} tone="success" />
        <MetricCard title="Inactive" value={String(inactiveCount)} tone="warning" />
      </section>

      <FilterPanel
        description="Sport, league ve prediction type filtreleri"
        footer={
          <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
            <span>Sayfa {meta?.page ?? filters.page} / {meta?.totalPages ?? 1}</span>
            <span>Toplam {meta?.total ?? rows.length}</span>
          </div>
        }
      >
        <SportLeagueFilters
          sport={filters.sport}
          leagueId={filters.leagueId}
          leagues={leaguesQuery.data?.data ?? []}
          onChange={(value) => setFilters(value)}
        />

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Prediction type</span>
          <select
            value={filters.predictionType}
            onChange={(event) => setFilters({ predictionType: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="">Tum tipler</option>
            {predictionTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Aktiflik</span>
          <select
            value={filters.isActive === undefined ? "all" : filters.isActive ? "true" : "false"}
            onChange={(event) => {
              const value = event.target.value;
              setFilters({ isActive: value === "all" ? undefined : value === "true" });
            }}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="all">Tum kayitlar</option>
            <option value="true">Sadece active</option>
            <option value="false">Sadece inactive</option>
          </select>
        </label>
      </FilterPanel>

      <SectionCard title="Strategy Table" subtitle="Endpoint: /api/v1/admin/models/strategies">
        <DataFeedback
          isLoading={strategiesQuery.isLoading}
          error={strategiesQuery.error as Error | undefined}
          isEmpty={rows.length === 0}
          emptyTitle="Strategy kaydi bulunamadi"
          emptyDescription="Secili filtrelerde strategy verisi yok."
          onRetry={() => void strategiesQuery.refetch()}
          loadingVariant="table"
          loadingCount={6}
        >
          <StrategyTable
            rows={rows}
            busyId={updateMutation.isPending ? updateMutation.variables?.strategyId ?? null : null}
            onEdit={openEditModal}
            onToggle={(item, nextActive) => setConfirmState({ type: "toggle", strategy: item, nextActive })}
          />

          {rows.some((item) => !item.fallbackModel) ? (
            <EmptyState
              tone="warning"
              title="Config Uyarisi"
              description="Bazi strategy kayitlarinda fallback model tanimli degil. Fail-safe akisini gozden gecirmenizi oneririz."
            />
          ) : null}
        </DataFeedback>
      </SectionCard>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
          <article className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Strategy Duzenle</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{editing.leagueName ?? "Tum ligler"} - {editing.predictionType}</p>

            <div className="mt-4 space-y-3">
              <label className="space-y-1">
                <span className="text-xs text-[color:var(--muted)]">Primary model</span>
                <input
                  value={editPrimaryModel}
                  onChange={(event) => setEditPrimaryModel(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[color:var(--muted)]">Fallback model</span>
                <input
                  value={editFallbackModel}
                  onChange={(event) => setEditFallbackModel(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-[color:var(--foreground)]">
                <input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} />
                Active strategy
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmState({
                    type: "save-edit",
                    strategyId: editing.id,
                    primaryModel: editPrimaryModel.trim(),
                    fallbackModel: editFallbackModel.trim(),
                    isActive: editActive
                  })
                }
                disabled={!editPrimaryModel.trim()}
                className="rounded-md border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-1.5 text-sm font-semibold"
              >
                Kaydet
              </button>
            </div>
          </article>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.type === "auto-select"
            ? "Auto-select onayi"
            : confirmState?.type === "toggle"
              ? "Strategy durumunu guncelle"
              : "Strategy degisikliklerini kaydet"
        }
        description={
          confirmState?.type === "auto-select"
            ? "Sistem strategy secimini son performans metriklerine gore otomatik guncelleyecek. Devam etmek istiyor musunuz?"
            : confirmState?.type === "toggle"
              ? `Bu strategy kaydi ${confirmState.nextActive ? "active" : "inactive"} yapilacak.`
              : "Primary/fallback model degisiklikleri kaydedilecek."
        }
        confirmLabel="Onayla"
        isProcessing={autoSelectMutation.isPending || updateMutation.isPending}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}

export default function StrategiesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <StrategiesPageContent />
    </Suspense>
  );
}
