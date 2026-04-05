"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  useMatchDetail,
  useMatchEvents,
  useMatchPrediction,
  useMatchStats,
  useTeamForm,
  useTeamSquad
} from "@/lib/hooks/use-api";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { MatchEventsTimeline } from "@/components/match/MatchEventsTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/states/EmptyState";
import { formatDate, formatDateTime, safeScore } from "@/lib/utils";

const ComparisonRadarChart = dynamic(
  () => import("@/components/charts/ComparisonRadarChart").then((mod) => mod.ComparisonRadarChart),
  { ssr: false }
);

const tabs = [
  { id: "overview", label: "Genel Bakis" },
  { id: "form", label: "Form" },
  { id: "stats", label: "Istatistik Karsilastirma" },
  { id: "h2h", label: "H2H" },
  { id: "lineup", label: "Kadro" },
  { id: "events", label: "Olaylar" },
  { id: "predictions", label: "Tahminler" },
  { id: "risk", label: "Risk Uyarilari" }
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const detailQuery = useMatchDetail(params.id);
  const eventsQuery = useMatchEvents(params.id);
  const statsQuery = useMatchStats(params.id);
  const predictionQuery = useMatchPrediction(params.id);

  const match = detailQuery.data?.data;
  const prediction = predictionQuery.data?.data;
  const stats = statsQuery.data?.data;
  const events = eventsQuery.data?.data ?? [];

  const homeFormQuery = useTeamForm(match?.homeTeamId);
  const awayFormQuery = useTeamForm(match?.awayTeamId);
  const homeSquadQuery = useTeamSquad(match?.homeTeamId);
  const awaySquadQuery = useTeamSquad(match?.awayTeamId);

  const homeForm = homeFormQuery.data?.data ?? [];
  const awayForm = awayFormQuery.data?.data ?? [];

  const predictionConfidence = prediction?.confidenceScore ?? match?.confidenceScore ?? null;
  const isLowConfidence = Boolean(prediction?.isLowConfidence) || (predictionConfidence ?? 0) < 67;
  const isRecommended = Boolean(prediction?.isRecommended) && !isLowConfidence;

  const predictionSummary = prediction?.summary ?? prediction?.modelExplanation ?? match?.summary ?? null;

  const mergedRiskFlags = useMemo(
    () => [...(prediction?.riskFlags ?? []), ...(match?.riskFlags ?? [])],
    [match?.riskFlags, prediction?.riskFlags]
  );

  const h2hSummary = (() => {
    if (match?.h2hSummary) return match.h2hSummary;
    if (homeForm.length === 0 && awayForm.length === 0) return "H2H verisi su an bulunmuyor.";

    const homeWins = homeForm.filter((item) => item.result === "W").length;
    const awayWins = awayForm.filter((item) => item.result === "W").length;

    return `${match?.homeTeamName ?? "Ev"} son formda ${homeWins} galibiyet, ${match?.awayTeamName ?? "Dep"} ${awayWins} galibiyet uretti.`;
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title={match ? `${match.homeTeamName} vs ${match.awayTeamName}` : "Mac Detay"}
        description={match ? `${match.leagueName} - ${formatDateTime(match.kickoffAt)}` : "Mac veri detayi"}
      />

      <DataFeedback
        isLoading={detailQuery.isLoading}
        error={detailQuery.error as Error | undefined}
        isEmpty={!match}
        emptyTitle="Mac verisi bulunamadi"
        emptyDescription="Mac detay endpoint'i veri dondurmedi."
        onRetry={() => {
          void detailQuery.refetch();
          void eventsQuery.refetch();
          void statsQuery.refetch();
          void predictionQuery.refetch();
        }}
      >
        {match ? (
          <>
            <SectionCard title="Mac Ozeti" subtitle={`${match.leagueName} - ${match.venue ?? "Stadyum bilgisi yok"}`}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-center">
                <div>
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">{match.homeTeamName}</p>
                  <p className="text-xs text-[color:var(--muted)]">Tarih: {formatDate(match.kickoffAt)}</p>
                </div>
                <p className="text-3xl font-semibold text-[color:var(--foreground)]">{safeScore(match.scoreHome)}</p>
                <p className="text-3xl font-semibold text-[color:var(--foreground)]">{safeScore(match.scoreAway)}</p>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">{match.awayTeamName}</p>
                  <p className="text-xs text-[color:var(--muted)]">Saat: {formatDateTime(match.kickoffAt)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <StatusBadge status={match.status} />
                {isRecommended ? <StatusBadge status="recommended" /> : null}
                {isLowConfidence ? <StatusBadge status="low-confidence" /> : null}
                <span className="text-sm text-[color:var(--muted)]">Round: {match.round ?? "-"}</span>
                <span className="text-sm text-[color:var(--muted)]">Guven: {predictionConfidence ?? "-"}%</span>
              </div>
            </SectionCard>

            <div className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-2">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-[color:var(--accent)] text-black"
                        : "text-[color:var(--muted)] hover:bg-[color:var(--surface-alt)] hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "overview" ? (
              <SectionCard title="Genel Bakis" subtitle="Temel mac ve model alani">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">Lig</p>
                    <p className="font-semibold text-[color:var(--foreground)]">{match.leagueName}</p>
                  </article>
                  <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">Beklenen skor</p>
                    <p className="font-semibold text-[color:var(--foreground)]">
                      {prediction?.expectedScore.home ?? match.expectedScoreHome ?? "-"} - {prediction?.expectedScore.away ?? match.expectedScoreAway ?? "-"}
                    </p>
                  </article>
                  <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">Model guven skoru</p>
                    <p className="font-semibold text-[color:var(--foreground)]">{predictionConfidence ?? "-"}%</p>
                  </article>
                  <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">Mac durumu</p>
                    <p className="font-semibold text-[color:var(--foreground)]">{match.status}</p>
                  </article>
                </div>
              </SectionCard>
            ) : null}

            {activeTab === "form" ? (
              <SectionCard title="Form" subtitle="Takimlarin son form noktalarinin dagilimi">
                <DataFeedback
                  isLoading={homeFormQuery.isLoading || awayFormQuery.isLoading}
                  error={(homeFormQuery.error as Error | undefined) ?? (awayFormQuery.error as Error | undefined)}
                  isEmpty={homeForm.length === 0 && awayForm.length === 0}
                  emptyTitle="Form verisi yok"
                  emptyDescription="Her iki takim icin de form verisi gelmedi."
                  onRetry={() => {
                    void homeFormQuery.refetch();
                    void awayFormQuery.refetch();
                  }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-4">
                      <h3 className="text-lg text-[color:var(--foreground)]">{match.homeTeamName}</h3>
                      <p className="mt-2 text-sm text-[color:var(--muted)]">
                        {homeForm.length > 0 ? homeForm.map((item) => item.result).join(" - ") : "Form verisi yok"}
                      </p>
                    </article>
                    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-4">
                      <h3 className="text-lg text-[color:var(--foreground)]">{match.awayTeamName}</h3>
                      <p className="mt-2 text-sm text-[color:var(--muted)]">
                        {awayForm.length > 0 ? awayForm.map((item) => item.result).join(" - ") : "Form verisi yok"}
                      </p>
                    </article>
                  </div>
                </DataFeedback>
              </SectionCard>
            ) : null}

            {activeTab === "stats" ? (
              <SectionCard title="Istatistik Karsilastirma" subtitle="Match stats endpoint verisi">
                <DataFeedback
                  isLoading={statsQuery.isLoading}
                  error={statsQuery.error as Error | undefined}
                  isEmpty={!stats}
                  emptyTitle="Istatistik verisi yok"
                  emptyDescription="Bu mac icin stats endpoint veri dondurmedi."
                  onRetry={() => void statsQuery.refetch()}
                >
                  <ComparisonRadarChart
                    values={[
                      { label: "Topa sahip", home: Math.round(stats?.possessionHome ?? 0), away: Math.round(stats?.possessionAway ?? 0) },
                      { label: "Sut", home: Math.round(stats?.shotsHome ?? 0), away: Math.round(stats?.shotsAway ?? 0) },
                      { label: "Isabetli", home: Math.round(stats?.shotsOnTargetHome ?? 0), away: Math.round(stats?.shotsOnTargetAway ?? 0) },
                      { label: "xG/Pace", home: Math.round((stats?.xgHome ?? stats?.paceHome ?? 0) * 20), away: Math.round((stats?.xgAway ?? stats?.paceAway ?? 0) * 20) },
                      { label: "Verimlilik", home: Math.round((stats?.efficiencyHome ?? 1) * 60), away: Math.round((stats?.efficiencyAway ?? 1) * 60) }
                    ]}
                  />
                </DataFeedback>
              </SectionCard>
            ) : null}

            {activeTab === "h2h" ? (
              <SectionCard title="H2H" subtitle="Karsilikli mac ve trend yorumu">
                <p className="text-sm text-[color:var(--muted)]">{h2hSummary}</p>
              </SectionCard>
            ) : null}

            {activeTab === "lineup" ? (
              <SectionCard title="Kadro" subtitle="Team squad endpoint verisi">
                <DataFeedback
                  isLoading={homeSquadQuery.isLoading || awaySquadQuery.isLoading}
                  error={(homeSquadQuery.error as Error | undefined) ?? (awaySquadQuery.error as Error | undefined)}
                  isEmpty={(homeSquadQuery.data?.data ?? []).length === 0 && (awaySquadQuery.data?.data ?? []).length === 0}
                  emptyTitle="Kadro verisi yok"
                  emptyDescription="Her iki takim icin de kadro endpoint'i veri dondurmedi."
                  onRetry={() => {
                    void homeSquadQuery.refetch();
                    void awaySquadQuery.refetch();
                  }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-4">
                      <h3 className="font-semibold text-[color:var(--foreground)]">{match.homeTeamName} kadro</h3>
                      <ul className="mt-2 space-y-1 text-sm text-[color:var(--muted)]">
                        {(homeSquadQuery.data?.data ?? []).length > 0 ? (
                          (homeSquadQuery.data?.data ?? []).map((player) => (
                            <li key={player.id}>{player.name} - {player.position}</li>
                          ))
                        ) : (
                          <li>Kadro verisi yok</li>
                        )}
                      </ul>
                    </article>
                    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface-alt)] p-4">
                      <h3 className="font-semibold text-[color:var(--foreground)]">{match.awayTeamName} kadro</h3>
                      <ul className="mt-2 space-y-1 text-sm text-[color:var(--muted)]">
                        {(awaySquadQuery.data?.data ?? []).length > 0 ? (
                          (awaySquadQuery.data?.data ?? []).map((player) => (
                            <li key={player.id}>{player.name} - {player.position}</li>
                          ))
                        ) : (
                          <li>Kadro verisi yok</li>
                        )}
                      </ul>
                    </article>
                  </div>
                </DataFeedback>
              </SectionCard>
            ) : null}

            {activeTab === "events" ? (
              <SectionCard title="Olaylar" subtitle="Canli olay ve son gelismeler">
                <DataFeedback
                  isLoading={eventsQuery.isLoading}
                  error={eventsQuery.error as Error | undefined}
                  isEmpty={events.length === 0}
                  emptyTitle="Olay verisi yok"
                  emptyDescription="Bu mac icin olay listesi bulunmuyor."
                  onRetry={() => void eventsQuery.refetch()}
                >
                  <MatchEventsTimeline events={events} />
                </DataFeedback>
              </SectionCard>
            ) : null}

            {activeTab === "predictions" ? (
              <SectionCard title="Tahminler" subtitle="Calibrated prediction output">
                <DataFeedback
                  isLoading={predictionQuery.isLoading}
                  error={predictionQuery.error as Error | undefined}
                  isEmpty={!prediction}
                  isPartial={!prediction?.probabilities || predictionConfidence == null}
                  emptyTitle="Tahmin verisi yok"
                  emptyDescription="Bu mac icin prediction endpoint veri dondurmuyor."
                  partialTitle="Kismi prediction verisi"
                  partialDescription="Bazi prediction alanlari eksik oldugu icin panel kisitli gosteriliyor."
                  onRetry={() => void predictionQuery.refetch()}
                >
                  {prediction ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {isRecommended ? <StatusBadge status="recommended" /> : null}
                        {isLowConfidence ? <StatusBadge status="low-confidence" /> : null}
                      </div>

                      <ProbabilityBar
                        home={prediction.probabilities.home}
                        draw={prediction.probabilities.draw}
                        away={prediction.probabilities.away}
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                          <p className="text-xs text-[color:var(--muted)]">Expected Score</p>
                          <p className="font-semibold text-[color:var(--foreground)]">
                            {prediction.expectedScore.home ?? "-"} - {prediction.expectedScore.away ?? "-"}
                          </p>
                        </article>
                        <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                          <p className="text-xs text-[color:var(--muted)]">Confidence Score</p>
                          <ConfidenceGauge value={predictionConfidence} />
                        </article>
                      </div>

                      <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                        <p className="text-xs text-[color:var(--muted)]">Summary</p>
                        <p className="text-sm text-[color:var(--foreground)]">{predictionSummary ?? "Prediction summary bulunmuyor."}</p>
                      </article>

                      {isLowConfidence ? (
                        <article className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                          Bu macin tahmininde confidence seviyesi dusuk. Karar verirken ek belirsizlik payi oldugunu dikkate alin.
                        </article>
                      ) : null}

                      {mergedRiskFlags.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {mergedRiskFlags.map((risk, index) => (
                            <li key={`${risk}-${index}`} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                              {risk}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyState title="Risk flag yok" description="Bu mac icin riskFlags alaninda kayit bulunmuyor." />
                      )}
                    </div>
                  ) : null}
                </DataFeedback>
              </SectionCard>
            ) : null}

            {activeTab === "risk" ? (
              <SectionCard title="Risk Uyarilari" subtitle="Model risk flags ve mac riskleri">
                <ul className="space-y-2">
                  {mergedRiskFlags.length > 0 ? (
                    mergedRiskFlags.map((risk, index) => (
                      <li key={`${risk}-${index}`} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                        {risk}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2 text-sm text-[color:var(--muted)]">
                      Risk uyarisi bulunmuyor.
                    </li>
                  )}
                </ul>
              </SectionCard>
            ) : null}
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}

