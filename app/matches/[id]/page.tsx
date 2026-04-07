"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
import { DataFeedback } from "@/components/states/DataFeedback";
import { MatchEventsTimeline } from "@/components/match/MatchEventsTimeline";
import { EmptyState } from "@/components/states/EmptyState";
import { formatDate, formatDateTime, safeScore, placeholderLogo, cn } from "@/lib/utils";

const ComparisonRadarChart = dynamic(
  () => import("@/components/charts/ComparisonRadarChart").then((mod) => mod.ComparisonRadarChart),
  { ssr: false }
);

const tabs = [
  { id: "overview", label: "Genel Bakış", icon: "📊" },
  { id: "form", label: "Form", icon: "📈" },
  { id: "stats", label: "İstatistik", icon: "📉" },
  { id: "h2h", label: "H2H", icon: "⚔️" },
  { id: "lineup", label: "Kadro", icon: "👥" },
  { id: "events", label: "Olaylar", icon: "⚡" },
  { id: "predictions", label: "Tahmin", icon: "🎯" },
  { id: "risk", label: "Risk", icon: "⚠️" }
] as const;

type TabId = (typeof tabs)[number]["id"];

// Team Logo Component
function TeamLogo({ name, logoUrl, size = 64 }: { name: string; logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        unoptimized
        className="rounded-2xl border-2 border-[#2A3035] bg-[#1F2529] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div 
      className="flex items-center justify-center rounded-2xl border-2 border-[#2A3035] bg-[#1F2529] text-xl font-bold text-[#7A84FF]"
      style={{ width: size, height: size }}
    >
      {placeholderLogo(name)}
    </div>
  );
}

// Stat Card
function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
      <p className="text-xs text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#ECEDEF]">{value}</p>
      {subtext && <p className="text-xs text-[#9CA3AF]/70">{subtext}</p>}
    </div>
  );
}

// Tab Button
function TabButton({ 
  tab, 
  isActive, 
  onClick 
}: { 
  tab: typeof tabs[number]; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all",
        isActive
          ? "bg-[#7A84FF] text-black"
          : "border border-[#2A3035] bg-[#171C1F] text-[#9CA3AF] hover:border-[#7A84FF]/50 hover:text-[#ECEDEF]"
      )}
    >
      <span>{tab.icon}</span>
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  );
}

// Section Header
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-[#ECEDEF]">{title}</h2>
      {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
    </div>
  );
}

// Form Badge
function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-[#34C759] text-black",
    L: "bg-[#FF3B30] text-white",
    D: "bg-[#9CA3AF] text-black",
  };
  return (
    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold", colors[result] || "bg-[#2A3035] text-[#9CA3AF]")}>
      {result === "W" ? "G" : result === "L" ? "M" : result === "D" ? "B" : result}
    </span>
  );
}

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
  const isLive = match?.status === "live";

  const mergedRiskFlags = useMemo(
    () => [...(prediction?.riskFlags ?? []), ...(match?.riskFlags ?? [])],
    [match?.riskFlags, prediction?.riskFlags]
  );

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7A84FF] border-t-transparent" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-6">
        <EmptyState 
          title="Maç bulunamadı" 
          description="Bu maç için veri bulunmuyor."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Hero Section - Match Header */}
      <section className="relative overflow-hidden rounded-3xl border border-[#2A3035] bg-gradient-to-b from-[#171C1F] to-[#0D0F10] p-6">
        {/* League & Date */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#1F2529] px-3 py-1.5 text-xs font-medium text-[#7A84FF]">
              {match.leagueName}
            </span>
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[#34C759]/10 px-3 py-1.5 text-xs font-bold text-[#34C759]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#34C759]" />
                CANLI
              </span>
            )}
          </div>
          <span className="text-[#9CA3AF]">{formatDateTime(match.kickoffAt)}</span>
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex flex-1 flex-col items-center text-center">
            <TeamLogo name={match.homeTeamName} logoUrl={match.homeLogoUrl} size={80} />
            <h1 className="mt-3 text-lg font-bold text-[#ECEDEF] sm:text-xl">{match.homeTeamName}</h1>
            <span className="text-xs text-[#9CA3AF]">Ev Sahibi</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center px-4">
            {isLive ? (
              <div className="rounded-2xl border-2 border-[#34C759]/30 bg-[#34C759]/10 px-6 py-3">
                <span className="text-4xl font-bold text-[#34C759]">
                  {safeScore(match.scoreHome)} - {safeScore(match.scoreAway)}
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-[#7A84FF]/30 bg-[#7A84FF]/10 px-8 py-4">
                <span className="text-3xl font-bold text-[#7A84FF]">VS</span>
              </div>
            )}
            {match.venue && (
              <span className="mt-2 text-xs text-[#9CA3AF]">🏟️ {match.venue}</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-1 flex-col items-center text-center">
            <TeamLogo name={match.awayTeamName} logoUrl={match.awayLogoUrl} size={80} />
            <h1 className="mt-3 text-lg font-bold text-[#ECEDEF] sm:text-xl">{match.awayTeamName}</h1>
            <span className="text-xs text-[#9CA3AF]">Deplasman</span>
          </div>
        </div>

        {/* Match Info Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {isRecommended && (
            <span className="rounded-full bg-[#34C759]/10 px-3 py-1 text-xs font-medium text-[#34C759]">
              ✓ Önerilen
            </span>
          )}
          {isLowConfidence && (
            <span className="rounded-full bg-[#FF9500]/10 px-3 py-1 text-xs font-medium text-[#FF9500]">
              ! Düşük Güven
            </span>
          )}
          {predictionConfidence && (
            <span className="rounded-full bg-[#1F2529] px-3 py-1 text-xs font-medium text-[#9CA3AF]">
              Güven: %{predictionConfidence}
            </span>
          )}
          {match.round && (
            <span className="rounded-full bg-[#1F2529] px-3 py-1 text-xs font-medium text-[#9CA3AF]">
              Hafta {match.round}
            </span>
          )}
        </div>
      </section>

      {/* Tabs Navigation */}
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {/* Tab Content */}
      <div className="rounded-2xl border border-[#2A3035] bg-[#171C1F] p-5">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <SectionHeader title="Maç Özeti" subtitle="Temel bilgiler ve tahmin özeti" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Lig" value={match.leagueName} />
              <StatCard 
                label="Beklenen Skor" 
                value={`${prediction?.expectedScore.home ?? match.expectedScoreHome ?? "?"} - ${prediction?.expectedScore.away ?? match.expectedScoreAway ?? "?"}`} 
              />
              <StatCard 
                label="Model Güveni" 
                value={`%${predictionConfidence ?? "-"}`}
                subtext={isLowConfidence ? "Düşük güven" : isRecommended ? "Yüksek güven" : undefined}
              />
              <StatCard 
                label="Durum" 
                value={isLive ? "Canlı" : match.status === "scheduled" ? "Planlandı" : match.status} 
              />
            </div>
          </>
        )}

        {/* FORM */}
        {activeTab === "form" && (
          <>
            <SectionHeader title="Takım Formu" subtitle="Son 5 maç performansı" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <TeamLogo name={match.homeTeamName} logoUrl={match.homeLogoUrl} size={40} />
                  <h3 className="font-semibold text-[#ECEDEF]">{match.homeTeamName}</h3>
                </div>
                <div className="flex gap-2">
                  {homeForm.length > 0 ? (
                    homeForm.slice(0, 5).map((item, i) => (
                      <FormBadge key={i} result={item.result} />
                    ))
                  ) : (
                    <span className="text-sm text-[#9CA3AF]">Form verisi yok</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <TeamLogo name={match.awayTeamName} logoUrl={match.awayLogoUrl} size={40} />
                  <h3 className="font-semibold text-[#ECEDEF]">{match.awayTeamName}</h3>
                </div>
                <div className="flex gap-2">
                  {awayForm.length > 0 ? (
                    awayForm.slice(0, 5).map((item, i) => (
                      <FormBadge key={i} result={item.result} />
                    ))
                  ) : (
                    <span className="text-sm text-[#9CA3AF]">Form verisi yok</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* STATS */}
        {activeTab === "stats" && (
          <>
            <SectionHeader title="İstatistik Karşılaştırma" subtitle="Takım istatistikleri" />
            <DataFeedback
              isLoading={statsQuery.isLoading}
              error={statsQuery.error as Error | undefined}
              isEmpty={!stats}
              emptyTitle="İstatistik yok"
              emptyDescription="Bu maç için istatistik verisi bulunmuyor."
              onRetry={() => void statsQuery.refetch()}
            >
              {stats && (
                <ComparisonRadarChart
                  values={[
                    { label: "Topla Oynama", home: Math.round(stats.possessionHome ?? 0), away: Math.round(stats.possessionAway ?? 0) },
                    { label: "Şut", home: Math.round(stats.shotsHome ?? 0), away: Math.round(stats.shotsAway ?? 0) },
                    { label: "İsabetli Şut", home: Math.round(stats.shotsOnTargetHome ?? 0), away: Math.round(stats.shotsOnTargetAway ?? 0) },
                    { label: "xG", home: Math.round((stats.xgHome ?? 0) * 10), away: Math.round((stats.xgAway ?? 0) * 10) },
                    { label: "Korner", home: Math.round(stats.cornersHome ?? 0), away: Math.round(stats.cornersAway ?? 0) }
                  ]}
                />
              )}
            </DataFeedback>
          </>
        )}

        {/* H2H */}
        {activeTab === "h2h" && (
          <>
            <SectionHeader title="Karşılıklı Maçlar" subtitle="Takımların birbirlerine karşı geçmişi" />
            <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
              <p className="text-sm text-[#9CA3AF]">
                {match.h2hSummary || "Karşılıklı maç verisi bulunmuyor."}
              </p>
            </div>
          </>
        )}

        {/* LINEUP */}
        {activeTab === "lineup" && (
          <>
            <SectionHeader title="Kadrolar" subtitle="Muhtemel ilk 11'ler" />
            <DataFeedback
              isLoading={homeSquadQuery.isLoading || awaySquadQuery.isLoading}
              isEmpty={(homeSquadQuery.data?.data ?? []).length === 0 && (awaySquadQuery.data?.data ?? []).length === 0}
              emptyTitle="Kadro verisi yok"
              emptyDescription="Kadro bilgisi henüz yayınlanmadı."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <TeamLogo name={match.homeTeamName} logoUrl={match.homeLogoUrl} size={40} />
                    <h3 className="font-semibold text-[#ECEDEF]">{match.homeTeamName}</h3>
                  </div>
                  <ul className="space-y-1">
                    {(homeSquadQuery.data?.data ?? []).map((player) => (
                      <li key={player.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#ECEDEF]">{player.name}</span>
                        <span className="text-xs text-[#9CA3AF]">{player.position}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <TeamLogo name={match.awayTeamName} logoUrl={match.awayLogoUrl} size={40} />
                    <h3 className="font-semibold text-[#ECEDEF]">{match.awayTeamName}</h3>
                  </div>
                  <ul className="space-y-1">
                    {(awaySquadQuery.data?.data ?? []).map((player) => (
                      <li key={player.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#ECEDEF]">{player.name}</span>
                        <span className="text-xs text-[#9CA3AF]">{player.position}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </DataFeedback>
          </>
        )}

        {/* EVENTS */}
        {activeTab === "events" && (
          <>
            <SectionHeader title="Maç Olayları" subtitle="Gol, kart ve diğer olaylar" />
            <DataFeedback
              isLoading={eventsQuery.isLoading}
              isEmpty={events.length === 0}
              emptyTitle="Olay yok"
              emptyDescription="Bu maç için olay kaydı bulunmuyor."
            >
              <MatchEventsTimeline events={events} isLive={isLive} />
            </DataFeedback>
          </>
        )}

        {/* PREDICTIONS */}
        {activeTab === "predictions" && (
          <>
            <SectionHeader title="AI Tahmini" subtitle="Model tahmini ve olasılıklar" />
            <DataFeedback
              isLoading={predictionQuery.isLoading}
              isEmpty={!prediction}
              emptyTitle="Tahmin yok"
              emptyDescription="Bu maç için tahmin verisi bulunmuyor."
            >
              {prediction && (
                <div className="space-y-4">
                  {/* Confidence Badge */}
                  <div className="flex gap-2">
                    {isRecommended && (
                      <span className="rounded-full bg-[#34C759]/10 px-4 py-2 text-sm font-bold text-[#34C759]">
                        ✓ Önerilen Tahmin
                      </span>
                    )}
                    {isLowConfidence && (
                      <span className="rounded-full bg-[#FF9500]/10 px-4 py-2 text-sm font-bold text-[#FF9500]">
                        ! Düşük Güven
                      </span>
                    )}
                  </div>

                  {/* Probabilities */}
                  <div className="rounded-xl bg-[#1F2529] p-4">
                    <div className="mb-3 flex justify-between text-sm">
                      <span className="text-[#34C759]">{match.homeTeamName}</span>
                      <span className="text-[#9CA3AF]">Beraberlik</span>
                      <span className="text-[#7A84FF]">{match.awayTeamName}</span>
                    </div>
                    <div className="flex h-10 overflow-hidden rounded-xl">
                      <div className="flex items-center justify-center bg-[#34C759] text-sm font-bold text-black" style={{ width: `${Math.max(prediction.probabilities.home ?? 0, 5)}%` }}>
                        {prediction.probabilities.home > 10 && `${Math.round(prediction.probabilities.home)}%`}
                      </div>
                      <div className="flex items-center justify-center bg-[#9CA3AF] text-sm font-bold text-black" style={{ width: `${Math.max(prediction.probabilities.draw ?? 0, 5)}%` }}>
                        {prediction.probabilities.draw > 10 && `${Math.round(prediction.probabilities.draw)}%`}
                      </div>
                      <div className="flex items-center justify-center bg-[#7A84FF] text-sm font-bold text-black" style={{ width: `${Math.max(prediction.probabilities.away ?? 0, 5)}%` }}>
                        {prediction.probabilities.away > 10 && `${Math.round(prediction.probabilities.away)}%`}
                      </div>
                    </div>
                  </div>

                  {/* Expected Score */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                      <p className="text-xs text-[#9CA3AF]">Beklenen Skor</p>
                      <p className="mt-1 text-2xl font-bold text-[#ECEDEF]">
                        {prediction.expectedScore.home ?? "?"} - {prediction.expectedScore.away ?? "?"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                      <p className="text-xs text-[#9CA3AF]">Güven Skoru</p>
                      <p className={`mt-1 text-2xl font-bold ${isLowConfidence ? "text-[#FF9500]" : "text-[#34C759]"}`}>
                        %{predictionConfidence ?? "-"}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  {prediction.summary && (
                    <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
                      <p className="text-xs text-[#9CA3AF]">Model Açıklaması</p>
                      <p className="mt-1 text-sm text-[#ECEDEF]">{prediction.summary}</p>
                    </div>
                  )}
                </div>
              )}
            </DataFeedback>
          </>
        )}

        {/* RISK */}
        {activeTab === "risk" && (
          <>
            <SectionHeader title="Risk Faktörleri" subtitle="Model tarafından tespit edilen riskler" />
            {mergedRiskFlags.length > 0 ? (
              <ul className="space-y-2">
                {mergedRiskFlags.map((risk, index) => (
                  <li key={index} className="flex items-center gap-3 rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/10 p-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF9500] text-sm font-bold text-black">!</span>
                    <span className="text-sm text-[#FF9500]">{risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-6 text-center">
                <span className="text-4xl">✓</span>
                <p className="mt-2 text-[#34C759]">Risk faktörü bulunmuyor</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
