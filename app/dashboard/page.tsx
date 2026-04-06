"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { MatchCard } from "@/components/cards/MatchCard";
import { PredictionCard } from "@/components/cards/PredictionCard";
import { RecentMatchesTable } from "@/components/tables/RecentMatchesTable";
import { DataFeedback } from "@/components/states/DataFeedback";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import {
  useDashboardAnalytics,
  useHighConfidencePredictions,
  useLiveMatches,
  useTodayMatches
} from "@/lib/hooks/use-api";
import { formatDateTime } from "@/lib/utils";

const LineChart = dynamic(() => import("@/components/charts/LineChart").then((mod) => mod.LineChart), {
  ssr: false,
  loading: () => <LoadingSkeleton className="h-52" />
});

const BarChart = dynamic(() => import("@/components/charts/BarChart").then((mod) => mod.BarChart), {
  ssr: false,
  loading: () => <LoadingSkeleton className="h-52" />
});

export default function DashboardPage() {
  const dashboardQuery = useDashboardAnalytics();
  const todayMatchesQuery = useTodayMatches({ pageSize: 6, sortBy: "kickoffAt", sortOrder: "asc" });
  const liveMatchesQuery = useLiveMatches({ pageSize: 4, sortBy: "kickoffAt", sortOrder: "asc", status: "live" });
  const highConfidenceQuery = useHighConfidencePredictions();

  const dashboard = dashboardQuery.data?.data;
  const todayMatches = todayMatchesQuery.data?.data ?? [];
  const liveMatches = liveMatchesQuery.data?.data ?? [];
  const highConfidence = highConfidenceQuery.data?.data ?? [];
  const updatedLeagues = dashboard?.updatedLeagues ?? [];
  const recentPredictions = dashboard?.recentPredictions ?? [];

  const topPredictions = (highConfidence.length > 0 ? highConfidence : dashboard?.highConfidencePredictions ?? []).slice(0, 4);
  const lowConfidencePredictions = recentPredictions.filter((item) => item.isLowConfidence || (item.confidenceScore ?? 0) < 67);
  const spotlightMatches = (todayMatches.length > 0 ? todayMatches : dashboard?.todayMatches ?? []).slice(0, 6);

  const trendSeries = (dashboard?.miniTrends ?? []).flatMap((trend) =>
    trend.values.map((value, index) => ({
      label: `${trend.label}-${index + 1}`,
      value
    }))
  );

  const confidenceChartData = [
    { label: "Düşük", value: dashboard?.riskDistribution?.low ?? 0 },
    { label: "Orta", value: dashboard?.riskDistribution?.medium ?? 0 },
    { label: "Yüksek", value: dashboard?.riskDistribution?.high ?? 0 }
  ];

  const hasPartialData =
    Boolean(dashboard) &&
    (topPredictions.length === 0 || updatedLeagues.length === 0 || recentPredictions.length === 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard"
        description="Kalibre edilmiş güven skorları, risk dağılımı ve güncel tahmin özeti"
      />

      <DataFeedback
        isLoading={dashboardQuery.isLoading}
        error={(dashboardQuery.error as Error | undefined) ?? (todayMatchesQuery.error as Error | undefined)}
        isEmpty={!dashboard}
        isPartial={hasPartialData}
        emptyTitle="Dashboard verisi bulunamadı"
        emptyDescription="Analitik özet şu an alınamıyor."
        partialTitle="Kısmi dashboard verisi"
        partialDescription="Bazı kartlar eksik gelebilir; sistem kalan verilerle gösterime devam ediyor."
        onRetry={() => {
          void dashboardQuery.refetch();
          void todayMatchesQuery.refetch();
          void liveMatchesQuery.refetch();
          void highConfidenceQuery.refetch();
        }}
        loadingCount={4}
      >
        {/* Stats Grid */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Bugünün Maç Sayısı"
            value={String(dashboard?.todayMatchCount ?? todayMatches.length)}
            hint="Güncel gün takvimi"
          />
          <StatCard
            title="Canlı Maç"
            value={String(dashboard?.liveMatchCount ?? liveMatches.length)}
            hint="Anlık takipteki maçlar"
          />
          <StatCard
            title="Kalibre Yüksek Güven"
            value={String(dashboard?.calibratedHighConfidenceCount ?? dashboard?.highConfidencePredictionCount ?? topPredictions.length)}
            hint="Kalibrasyon sonrası yüksek güven"
            tone="success"
          />
          <StatCard
            title="Düşük Güven"
            value={String(dashboard?.lowConfidenceCount ?? lowConfidencePredictions.length)}
            hint="Ek yorum gerektiren tahminler"
            tone="warning"
          />
        </section>

        {/* Charts Row */}
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Sistem Performans Trendi" subtitle="Takım bazlı mini trend alanları">
            {trendSeries.length > 0 ? (
              <LineChart data={trendSeries} />
            ) : (
              <EmptyState title="Trend verisi yok" description="Model trend serileri gelince bu alan otomatik dolacak." />
            )}
          </SectionCard>

          <SectionCard title="Risk Dağılımı" subtitle="Düşük / Orta / Yüksek tahmin sayısı">
            {(dashboard?.riskDistribution?.low ?? 0) + (dashboard?.riskDistribution?.medium ?? 0) + (dashboard?.riskDistribution?.high ?? 0) > 0 ? (
              <BarChart data={confidenceChartData} />
            ) : (
              <EmptyState title="Risk dağılımı yok" description="Risk dağılımı verisi şu an paylaşılmadı." />
            )}
          </SectionCard>
        </section>

        {/* Calibration & Leagues */}
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Kalibrasyon Durumu" subtitle="Model kalibrasyon sağlık özeti">
            {dashboard?.calibrationHealthSummary ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-lg border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Durum</p>
                  <p className="mt-1 text-lg font-semibold text-[#ECEDEF]">{dashboard.calibrationHealthSummary.status ?? "-"}</p>
                </article>
                <article className="rounded-lg border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Ortalama Güven</p>
                  <p className="mt-1 text-lg font-semibold text-[#ECEDEF]">{dashboard.avgConfidenceScore ?? "-"}%</p>
                </article>
                <article className="rounded-lg border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Brier Skoru</p>
                  <p className="mt-1 text-lg font-semibold text-[#ECEDEF]">{dashboard.calibrationHealthSummary.brierScore ?? "-"}</p>
                </article>
                <article className="rounded-lg border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">ECE</p>
                  <p className="mt-1 text-lg font-semibold text-[#ECEDEF]">{dashboard.calibrationHealthSummary.ece ?? "-"}</p>
                </article>
                <article className="sm:col-span-2 rounded-lg border border-[#2A3035] bg-[#1F2529] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Not</p>
                  <p className="mt-1 text-sm text-[#ECEDEF]">{dashboard.calibrationHealthSummary.note ?? "Not bulunmuyor."}</p>
                  <p className="mt-2 text-xs text-[#9CA3AF]">Güncelleme: {formatDateTime(dashboard.calibrationHealthSummary.updatedAt)}</p>
                </article>
              </div>
            ) : (
              <EmptyState title="Kalibrasyon özeti yok" description="Kalibrasyon sağlık özeti endpoint verisi bekleniyor." />
            )}
          </SectionCard>

          <SectionCard title="Son Güncellenen Ligler" subtitle="Veri akışı son güncellenen ligler">
            {updatedLeagues.length > 0 ? (
              <ul className="space-y-2">
                {updatedLeagues.map((league) => (
                  <li key={league.id} className="rounded-lg border border-[#2A3035] bg-[#1F2529] px-4 py-3">
                    <p className="font-medium text-[#ECEDEF]">{league.name}</p>
                    <p className="text-xs text-[#9CA3AF]">
                      {league.country} — {league.season}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">Güncelleme: {formatDateTime(league.updatedAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Lig güncellemesi yok" description="Son güncellenen lig bilgisi şu an paylaşılmadı." />
            )}
          </SectionCard>
        </section>

        {/* Spotlight Matches */}
        <SectionCard title="Bugünün Öne Çıkan Maçları" subtitle="Canlı ve yaklaşan maçlar">
          {spotlightMatches.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {spotlightMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState title="Maç listesi boş" description="Bugün için gösterilecek maç bulunmuyor." />
          )}
        </SectionCard>

        {/* Predictions */}
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Yüksek Güven Tahminleri" subtitle="Güven skoru odaklı model çıktıları">
            {topPredictions.length > 0 ? (
              <div className="grid gap-4">
                {topPredictions.map((prediction) => (
                  <PredictionCard key={prediction.id} prediction={prediction} />
                ))}
              </div>
            ) : (
              <EmptyState title="Yüksek güven tahmini yok" description="Bu saat aralığında güven thresholdu aşan tahmin yok." />
            )}
          </SectionCard>

          <SectionCard title="Düşük Güven Tahminler" subtitle="Ek kontrol gerektiren tahminler">
            {lowConfidencePredictions.length > 0 ? (
              <div className="space-y-4">
                {lowConfidencePredictions.slice(0, 4).map((item) => (
                  <PredictionCard key={`low-${item.id}`} prediction={item} />
                ))}
              </div>
            ) : (
              <EmptyState title="Düşük güven kayıt yok" description="Şu anda düşük güvenli tahmin kaydı bulunmuyor." />
            )}
          </SectionCard>
        </section>

        {/* Table */}
        <SectionCard title="Son Tahmin Özet Tablosu" subtitle="Canlı maçlar ve recent predictions overview">
          {liveMatches.length > 0 || spotlightMatches.length > 0 ? (
            <RecentMatchesTable matches={liveMatches.length > 0 ? liveMatches : spotlightMatches.slice(0, 4)} />
          ) : (
            <EmptyState title="Tablo verisi yok" description="Özet tabloda gösterilecek maç verisi bulunmuyor." />
          )}
        </SectionCard>
      </DataFeedback>
    </div>
  );
}
