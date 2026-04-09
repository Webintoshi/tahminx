"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { TeamComparisonForm } from "@/components/team-comparison/TeamComparisonForm";
import { TeamComparisonHeaderCard } from "@/components/team-comparison/TeamComparisonHeaderCard";
import { TeamComparisonGrid } from "@/components/team-comparison/TeamComparisonGrid";
import { TeamScenarioList } from "@/components/team-comparison/TeamScenarioList";
import { ScorelineList } from "@/components/team-comparison/ScorelineList";
import { ComparisonConfidenceCard } from "@/components/team-comparison/ComparisonConfidenceCard";
import { ComparisonExplanationPanel } from "@/components/team-comparison/ComparisonExplanationPanel";
import { useLeagues, useSeasons, useTeams } from "@/lib/hooks/use-api";
import { useTeamComparison } from "@/lib/hooks/use-team-comparison";
import {
  buildTeamComparisonQuery,
  buildTeamComparisonSearch,
  getTeamComparisonValidationMessage,
  isTeamComparisonReady,
  type TeamComparisonFormState
} from "@/lib/team-comparison";
import { formatDateTime } from "@/lib/utils";

const LazyRadarChart = dynamic(
  () => import("@/components/team-comparison/ComparisonRadarChart").then((module) => module.ComparisonRadarChart),
  {
    ssr: false,
    loading: () => <LoadingSkeleton className="h-[320px]" />
  }
);

const LazyBarChart = dynamic(
  () => import("@/components/team-comparison/ComparisonBarChart").then((module) => module.ComparisonBarChart),
  {
    ssr: false,
    loading: () => <LoadingSkeleton className="h-[320px]" />
  }
);

export function TeamComparisonPageClient({
  initialQuery,
  currentPath = "/compare/teams"
}: {
  initialQuery: TeamComparisonFormState;
  currentPath?: string;
}) {
  const [formState, setFormState] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);

  useEffect(() => {
    setFormState(initialQuery);
    setSubmittedQuery(initialQuery);
  }, [initialQuery]);

  const leaguesQuery = useLeagues({ sport: "football", pageSize: 100, sortBy: "name", sortOrder: "asc" });
  const teamsQuery = useTeams({
    sport: "football",
    leagueId: formState.leagueId || undefined,
    pageSize: 100,
    sortBy: "name",
    sortOrder: "asc"
  });
  const seasonsQuery = useSeasons(formState.leagueId || undefined);

  const teams = teamsQuery.data?.data ?? [];
  const leagues = leaguesQuery.data?.data ?? [];
  const seasons = useMemo(() => seasonsQuery.data?.data ?? [], [seasonsQuery.data?.data]);
  const validationMessage = getTeamComparisonValidationMessage(formState);
  const canSubmit = isTeamComparisonReady(formState);
  const shouldQuery = isTeamComparisonReady(submittedQuery);

  const comparisonQuery = useTeamComparison({
    ...buildTeamComparisonQuery(submittedQuery),
    enabled: shouldQuery
  });

  useEffect(() => {
    if (!formState.seasonId || !seasons.length) return;
    if (!seasons.some((season) => season.id === formState.seasonId)) {
      setFormState((current) => ({ ...current, seasonId: "" }));
    }
  }, [formState.seasonId, seasons]);

  const comparison = comparisonQuery.data?.data;
  const alertMessages = useMemo(() => {
    if (!comparison) return [];
    const messages: string[] = [];
    if (comparison.confidence.band === "low") {
      messages.push("Guven skoru dusuk; bu cevap daha ihtiyatli okunmali.");
    }
    if (comparison.metadata.crossLeague) {
      messages.push("Farkli liglerden takimlar karsilastiriliyor; baglam farki tempoyu etkileyebilir.");
    }
    if (comparison.metadata.cacheHit) {
      messages.push("Yanitta cache kullanildi; yeni veri geldiyse kisa sureli farklar olabilir.");
    }
    return messages;
  }, [comparison]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const nextState = { ...formState };
    setSubmittedQuery(nextState);
    const search = buildTeamComparisonSearch(nextState);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", search ? `${currentPath}?${search}` : currentPath);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <nav aria-label="Page breadcrumb" className="text-sm text-[#9CA3AF]">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/dashboard" className="hover:text-[#ECEDEF]">Dashboard</Link></li>
            <li>/</li>
            <li><Link href="/compare/teams" className="hover:text-[#ECEDEF]">Compare</Link></li>
            <li>/</li>
            <li className="text-[#ECEDEF]">Team Comparison</li>
          </ol>
        </nav>
        <PageHeader
          title="Takim Karsilastirma"
          description="Iki takimi mevcut prediction ve feature katmanindan gelen sinyallerle ayni ekranda oku."
        />
      </div>

      <SectionCard
        title="Comparison form"
        subtitle="Secimler URL query parametreleriyle senkronize tutulur."
      >
        <TeamComparisonForm
          form={formState}
          teams={teams}
          leagues={leagues}
          seasons={seasons}
          onChange={(patch) => setFormState((current) => ({ ...current, ...patch }))}
          onSubmit={handleSubmit}
          disabled={!canSubmit}
          isSubmitting={comparisonQuery.isFetching && !comparison}
          validationMessage={validationMessage}
          isTeamsLoading={teamsQuery.isLoading}
          isLeaguesLoading={leaguesQuery.isLoading}
          isSeasonsLoading={seasonsQuery.isLoading}
        />
      </SectionCard>

      {!shouldQuery ? (
        <EmptyState
          title="Karsilastirma hazir degil"
          description="Iki farkli takim secip karsilastirmayi baslatin. Query parametreleri doluysa sayfa yenilemede ayni secim korunur."
        />
      ) : comparisonQuery.isLoading && !comparison ? (
        <div className="grid gap-4">
          <LoadingSkeleton className="h-40" />
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
        </div>
      ) : comparisonQuery.error ? (
        <ErrorState
          title="Team comparison yuklenemedi"
          description={(comparisonQuery.error as Error).message}
          onRetry={() => void comparisonQuery.refetch()}
        />
      ) : !comparison ? (
        <EmptyState
          title="Veri bulunamadi"
          description="Backend bu secim icin karsilastirma verisi donmedi."
          tone="warning"
        />
      ) : (
        <>
          {alertMessages.length ? (
            <div className="grid gap-3">
              {alertMessages.map((message) => (
                <div key={message} className="rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/10 px-4 py-3 text-sm text-[#ECEDEF]">
                  {message}
                </div>
              ))}
            </div>
          ) : null}

          <TeamComparisonHeaderCard header={comparison.header} metadata={comparison.metadata} />

          <SectionCard
            title="Main comparison"
            subtitle="Genel guc ve kategori bazli ustunlukler."
            action={comparisonQuery.isFetching ? <span className="text-xs text-[#9CA3AF]">Guncelleniyor...</span> : null}
          >
            <TeamComparisonGrid
              comparison={comparison.comparison}
              homeLabel={comparison.header.homeTeam.shortName || "Ev"}
              awayLabel={comparison.header.awayTeam.shortName || "Dep"}
            />
          </SectionCard>

          <SectionCard
            title="Probability ve scenario"
            subtitle="Toplam edge, skor satirlari ve ilk senaryo okumasi."
          >
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Home edge", value: comparison.probabilities.homeEdge },
                    { label: "Draw tendency", value: comparison.probabilities.drawTendency },
                    { label: "Away threat", value: comparison.probabilities.awayThreatLevel },
                    { label: "Over tendency", value: comparison.probabilities.overTendency },
                    { label: "BTTS tendency", value: comparison.probabilities.bttsTendency },
                    { label: "Expected score", valueLabel: `${comparison.probabilities.expectedScore.home.toFixed(2)} - ${comparison.probabilities.expectedScore.away.toFixed(2)}` }
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                      <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold text-[#ECEDEF]">
                        {"valueLabel" in item ? item.valueLabel : `${item.value.toFixed(0)}%`}
                      </p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-[#ECEDEF]">Top 5 scorelines</p>
                  <ScorelineList scorelines={comparison.probabilities.topScorelines} />
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-[#ECEDEF]">Top scenarios</p>
                <TeamScenarioList scenarios={comparison.scenarios} />
              </div>
            </div>
          </SectionCard>

          <ComparisonExplanationPanel explanation={comparison.explanation} />

          <SectionCard
            title="Visualization"
            subtitle="Grafiklerin yaninda ayni sinyalleri metinsel olarak da gorebilirsiniz."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
                <p className="mb-4 text-sm font-semibold text-[#ECEDEF]">Radar view</p>
                <LazyRadarChart visualization={comparison.visualization} header={comparison.header} />
              </div>
              <div className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
                <p className="mb-4 text-sm font-semibold text-[#ECEDEF]">Bar view</p>
                <LazyBarChart visualization={comparison.visualization} header={comparison.header} />
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <ComparisonConfidenceCard confidence={comparison.confidence} metadata={comparison.metadata} />
            <SectionCard
              title="Metadata"
              subtitle="Kullanilan pencere, match kaynaklari ve cache detaylari."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Used windows</p>
                  <p className="mt-2 text-sm text-[#ECEDEF]">
                    Home: {comparison.metadata.usedWindows.home} / Away: {comparison.metadata.usedWindows.away}
                  </p>
                  <p className="mt-2 text-xs text-[#9CA3AF]">Feature set: {comparison.metadata.usedFeatureSet}</p>
                </div>
                <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Generated at</p>
                  <p className="mt-2 text-sm text-[#ECEDEF]">{formatDateTime(comparison.metadata.generatedAt)}</p>
                  <p className="mt-2 text-xs text-[#9CA3AF]">Cache source: {comparison.metadata.cacheSource || "fresh"}</p>
                </div>
                <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Home matches</p>
                  <p className="mt-2 break-all text-sm text-[#ECEDEF]">{comparison.metadata.usedMatches.home.join(", ") || "-"}</p>
                </div>
                <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Away matches</p>
                  <p className="mt-2 break-all text-sm text-[#ECEDEF]">{comparison.metadata.usedMatches.away.join(", ") || "-"}</p>
                </div>
              </div>
              {comparison.metadata.warnings.length ? (
                <div className="mt-4 rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Warnings</p>
                  <ul className="mt-3 space-y-2 text-sm text-[#ECEDEF]">
                    {comparison.metadata.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
