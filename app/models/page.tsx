"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useModels } from "@/lib/hooks/use-api";

export default function ModelsPage() {
  const { data, error, isLoading, refetch } = useModels();
  const models = data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Modeller ve Guven Skoru"
        description="Tahmin nasil olustu, veri guveni ve belirsizlik gostergesi"
      />

      <DataFeedback
        isLoading={isLoading}
        error={error as Error | undefined}
        isEmpty={models.length === 0}
        emptyTitle="Model verisi yok"
        emptyDescription="Model kartlari su an listelenemiyor."
        onRetry={() => void refetch()}
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => (
            <SectionCard
              key={model.id}
              title={model.name}
              subtitle="Tahmin aciklama karti"
              action={<InfoTooltip label="i" content="Model confidence, data quality ve uncertainty birlikte okunmalidir." />}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[color:var(--muted)]">Model guven skoru</p>
                  <ConfidenceGauge value={model.confidence} />
                </div>
                <div>
                  <p className="text-xs text-[color:var(--muted)]">Veri guven seviyesi</p>
                  <ConfidenceGauge value={model.dataReliability} />
                </div>
                <div>
                  <p className="text-xs text-[color:var(--muted)]">Belirsizlik gostergesi</p>
                  <ConfidenceGauge value={100 - model.uncertainty} />
                </div>
                <p className="text-sm text-[color:var(--muted)]">{model.explanation}</p>
              </div>
            </SectionCard>
          ))}
        </div>
      </DataFeedback>
    </div>
  );
}

