"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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

const navigationItems = [
  { href: "/football", label: "Genel Bakış" },
  { href: "/football/pre-match", label: "Maç Ön Analiz" },
  { href: "/football/team-comparison", label: "Takım Karşılaştırma" },
  { href: "/football/form-analysis", label: "Form Analizi" },
  { href: "/football/goal-expectation", label: "Gol Beklentisi" },
];

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
    <div className="space-y-6 p-6">
      <PageHeader title={title} description={description} />

      {/* Navigation */}
      <nav className="flex flex-wrap gap-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-[#2A3035] bg-[#171C1F] px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#3A4047] hover:text-[#ECEDEF]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <SectionCard title={focusTitle} subtitle="Model katmanında öne çıkan ana metrikler">
        <ComparisonRadarChart
          values={[
            { label: "Form", home: 78, away: 64 },
            { label: "Hücum", home: 82, away: 71 },
            { label: "Savunma", home: 74, away: 69 },
            { label: "Tempo", home: sport === "basketball" ? 80 : 61, away: sport === "basketball" ? 74 : 58 },
            { label: "Derinlik", home: 70, away: 66 }
          ]}
        />
      </SectionCard>

      <SectionCard title="Yaklaşan Maçlar" subtitle="Ön analiz ve form katmanı ile hazırlandı">
        <DataFeedback
          isLoading={matchesQuery.isLoading}
          error={matchesQuery.error as Error | undefined}
          isEmpty={matches.length === 0}
          emptyTitle="Maç bulunamadı"
          emptyDescription="Seçili filtreye uygun analiz edilecek maç yok."
          onRetry={() => void matchesQuery.refetch()}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {matches.slice(0, 4).map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        </DataFeedback>
      </SectionCard>

      <SectionCard title="Model Tahminleri" subtitle="Güven skoru sıralamasına göre">
        <DataFeedback
          isLoading={predictionsQuery.isLoading}
          error={predictionsQuery.error as Error | undefined}
          isEmpty={predictions.length === 0}
          emptyTitle="Tahmin bulunamadı"
          emptyDescription="Bu spor türü için tahmin bulunmuyor."
          onRetry={() => void predictionsQuery.refetch()}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {predictions.slice(0, 4).map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} />)}
          </div>
        </DataFeedback>
      </SectionCard>
    </div>
  );
}
