"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { EmptyState } from "@/components/states/EmptyState";
import { useLowConfidencePredictions } from "@/lib/hooks/use-api";
import { PredictionCard } from "@/components/cards/PredictionCard";

export default function AdminLowConfidencePage() {
  const lowConfidenceQuery = useLowConfidencePredictions({
    pageSize: 20,
    sortBy: "confidenceScore",
    sortOrder: "asc",
    isLowConfidence: true
  });

  const rows = lowConfidenceQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Low Confidence"
        description="Dusuk confidence seviyesindeki prediction kayitlari"
      />

      <SectionCard title="Low Confidence Listesi" subtitle="Admin endpoint: /api/v1/admin/predictions/low-confidence">
        <DataFeedback
          isLoading={lowConfidenceQuery.isLoading}
          error={lowConfidenceQuery.error as Error | undefined}
          isEmpty={rows.length === 0}
          emptyTitle="Dusuk confidence kaydi yok"
          emptyDescription="Low-confidence endpoint su an bos kayit donduruyor."
          onRetry={() => void lowConfidenceQuery.refetch()}
          loadingCount={8}
          loadingVariant="list"
        >
          <div className="grid gap-3 xl:grid-cols-2">
            {rows.map((item) => (
              <PredictionCard key={item.id} prediction={item} />
            ))}
          </div>

          <EmptyState
            tone="warning"
            title="Operasyon Notu"
            description="Dusuk confidence kayitlari otomatik engellenmez; bu panel karar destegi icin izleme amacli kullanilir."
          />
        </DataFeedback>
      </SectionCard>
    </div>
  );
}
