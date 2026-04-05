"use client";

import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { SportLeagueFilters } from "@/components/admin/SportLeagueFilters";
import { ExperimentForm, type ExperimentDraft } from "@/components/admin/ExperimentForm";
import { ExperimentResultsTable } from "@/components/admin/ExperimentResultsTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MetricCard } from "@/components/admin/MetricCard";
import { useToast } from "@/components/providers/ToastProvider";
import { useAdminQueryState } from "@/lib/hooks/use-admin-query-state";
import {
  useFeatureExperimentResults,
  useFeatureLab,
  useLeagues,
  useModelStrategies,
  useRunFeatureExperiment
} from "@/lib/hooks/use-api";

function FeatureExperimentsPageContent() {
  const { filters, setFilters } = useAdminQueryState("updatedAt");
  const { showToast } = useToast();

  const leaguesQuery = useLeagues({ sport: filters.sport, pageSize: 200 });
  const labQuery = useFeatureLab({ sport: filters.sport });
  const strategiesQuery = useModelStrategies({ sport: filters.sport, pageSize: 200 });
  const resultsQuery = useFeatureExperimentResults({
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
  const runMutation = useRunFeatureExperiment();

  const [confirmRun, setConfirmRun] = useState(false);
  const [draft, setDraft] = useState<ExperimentDraft>({
    modelVersion: "",
    featureSetId: "",
    leagueId: "",
    from: "",
    to: ""
  });

  const results = useMemo(() => resultsQuery.data?.data ?? [], [resultsQuery.data?.data]);
  const meta = resultsQuery.data?.meta;

  const modelOptions = useMemo(
    () =>
      Array.from(
        new Set((strategiesQuery.data?.data ?? []).map((item) => item.primaryModel).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [strategiesQuery.data?.data]
  );

  const featureSets = useMemo(
    () =>
      (labQuery.data?.data.featureSets ?? []).filter(
        (set) => filters.sport === "all" || set.sportKey === filters.sport
      ),
    [filters.sport, labQuery.data?.data.featureSets]
  );

  const bestRow = useMemo(() => {
    return [...results]
      .filter((row) => row.accuracy != null)
      .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0];
  }, [results]);

  const executeRun = () => {
    runMutation.mutate(
      {
        modelVersion: draft.modelVersion,
        featureSetId: draft.featureSetId,
        leagueId: draft.leagueId,
        from: draft.from,
        to: draft.to
      },
      {
        onSuccess: (response) => {
          showToast({
            tone: "success",
            title: "Experiment baslatildi",
            description: `Experiment ID: ${response.data.id}`
          });
          setConfirmRun(false);
          void resultsQuery.refetch();
        },
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Experiment baslatilamadi",
            description: error instanceof Error ? error.message : "Bilinmeyen hata"
          });
          setConfirmRun(false);
        }
      }
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Feature Experiments"
        description="Feature set karsilastirma deneyleri ve metrik sonuclari"
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Experiment Result" value={String(meta?.total ?? results.length)} />
        <MetricCard title="Model Option" value={String(modelOptions.length)} />
        <MetricCard
          title="Best Feature Set"
          value={bestRow?.featureSetName ?? "-"}
          subtitle={bestRow?.accuracy != null ? `Accuracy ${bestRow.accuracy.toFixed(1)}%` : undefined}
          tone="success"
        />
      </section>

      <FilterPanel description="Sonuc tablosu icin sport, league ve model filtreleri">
        <SportLeagueFilters
          sport={filters.sport}
          leagueId={filters.leagueId}
          leagues={leaguesQuery.data?.data ?? []}
          onChange={(value) => setFilters(value)}
        />

        <label className="space-y-1">
          <span className="text-xs text-[color:var(--muted)]">Model version</span>
          <select
            value={filters.modelVersion}
            onChange={(event) => setFilters({ modelVersion: event.target.value })}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          >
            <option value="">Tum modeller</option>
            {modelOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </FilterPanel>

      <SectionCard title="Experiment Form" subtitle="Endpoint: /api/v1/admin/features/lab/experiment">
        <ExperimentForm
          modelOptions={modelOptions}
          featureSets={featureSets}
          leagues={leaguesQuery.data?.data ?? []}
          draft={draft}
          running={runMutation.isPending}
          onChange={(next) => setDraft((current) => ({ ...current, ...next }))}
          onSubmit={() => setConfirmRun(true)}
        />
      </SectionCard>

      <SectionCard title="Experiment Results" subtitle="Accuracy, logLoss, brierScore ve sampleSize">
        <DataFeedback
          isLoading={resultsQuery.isLoading}
          error={resultsQuery.error as Error | undefined}
          isEmpty={results.length === 0}
          emptyTitle="Experiment sonucu bulunamadi"
          emptyDescription="Secili filtrelerde experiment result listesi bos."
          onRetry={() => void resultsQuery.refetch()}
          loadingVariant="table"
          loadingCount={5}
        >
          <ExperimentResultsTable rows={results} />
        </DataFeedback>
      </SectionCard>

      {results.length > 0 ? (
        <EmptyState
          title="Kazanan Feature Set"
          description={bestRow?.featureSetName ? `${bestRow.featureSetName} su anda en yuksek accuracy degeri ile one cikiyor.` : "Kazanan set henuz net degil."}
        />
      ) : null}

      <ConfirmDialog
        open={confirmRun}
        title="Experiment baslatilsin mi?"
        description="Bu islem secili model ve feature set ile yeni deney calistirir. Islem tamamlanana kadar sonuc paneli gecikmeli guncellenebilir."
        isProcessing={runMutation.isPending}
        onCancel={() => setConfirmRun(false)}
        onConfirm={executeRun}
      />
    </div>
  );
}

export default function FeatureExperimentsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-36" />}>
      <FeatureExperimentsPageContent />
    </Suspense>
  );
}
