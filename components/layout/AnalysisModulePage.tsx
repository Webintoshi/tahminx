"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchCard } from "@/components/cards/MatchCard";
import { PredictionCard } from "@/components/cards/PredictionCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { useMatches, usePredictions } from "@/lib/hooks/use-api";
import type { SportKey } from "@/types/api-contract";

const ComparisonRadarChart = dynamic(
  () => import("@/components/charts/ComparisonRadarChart").then((mod) => mod.ComparisonRadarChart),
  { ssr: false }
);

interface AnalysisModulePageProps {
  sport: SportKey;
  title: string;
  description: string;
  focusTitle: string;
}

export function AnalysisModulePage({ sport, title, description, focusTitle }: AnalysisModulePageProps) {
  const matchesQuery = useMatches({ sport, status: "scheduled", pageSize: 8, sortBy: "kickoffAt", sortOrder: "asc" });
  const predictionsQuery = usePredictions({
    sport,
    pageSize: 8,
    sortBy: "confidenceScore",
    sortOrder: "desc"
  });

  const matches = matchesQuery.data?.data ?? [];
  const predictions = predictionsQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />

      <SectionCard title={focusTitle} subtitle="Model katmaninda one cikan ana metrikler">
        <ComparisonRadarChart
          values={[
            { label: "Form", home: 78, away: 64 },
            { label: "Hucum", home: 82, away: 71 },
            { label: "Savunma", home: 74, away: 69 },
            { label: "Tempo", home: sport === "basketball" ? 80 : 61, away: sport === "basketball" ? 74 : 58 },
            { label: "Derinlik", home: 70, away: 66 }
          ]}
        />
      </SectionCard>

      <SectionCard title="Yaklasan Maclar" subtitle="On analiz ve form katmani ile hazirlandi">
        <DataFeedback
          isLoading={matchesQuery.isLoading}
          error={matchesQuery.error as Error | undefined}
          isEmpty={matches.length === 0}
          emptyTitle="Mac bulunamadi"
          emptyDescription="Secili filtrede analiz edilecek mac yok."
          onRetry={() => void matchesQuery.refetch()}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {matches.slice(0, 4).map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        </DataFeedback>
      </SectionCard>

      <SectionCard title="Model Tahminleri" subtitle="Guven skoru siralamasina gore">
        <DataFeedback
          isLoading={predictionsQuery.isLoading}
          error={predictionsQuery.error as Error | undefined}
          isEmpty={predictions.length === 0}
          emptyTitle="Tahmin bulunamadi"
          emptyDescription="Bu spor turu icin tahmin bulunmuyor."
          onRetry={() => void predictionsQuery.refetch()}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {predictions.slice(0, 4).map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} />)}
          </div>
        </DataFeedback>
      </SectionCard>
    </div>
  );
}

