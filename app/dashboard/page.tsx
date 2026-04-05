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
    { label: "Low", value: dashboard?.riskDistribution?.low ?? 0 },
    { label: "Medium", value: dashboard?.riskDistribution?.medium ?? 0 },
    { label: "High", value: dashboard?.riskDistribution?.high ?? 0 }
  ];

  const hasPartialData =
    Boolean(dashboard) &&
    (topPredictions.length === 0 || updatedLeagues.length === 0 || recentPredictions.length === 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Calibrated confidence, risk dagilimi ve guncel prediction ozeti"
      />

      <DataFeedback
        isLoading={dashboardQuery.isLoading}
        error={(dashboardQuery.error as Error | undefined) ?? (todayMatchesQuery.error as Error | undefined)}
        isEmpty={!dashboard}
        isPartial={hasPartialData}
        emptyTitle="Dashboard verisi bulunamadi"
        emptyDescription="Analitik ozet su an alinamiyor."
        partialTitle="Kismi dashboard verisi"
        partialDescription="Bazi kartlar eksik gelebilir; sistem kalan verilerle gosterime devam ediyor."
        onRetry={() => {
          void dashboardQuery.refetch();
          void todayMatchesQuery.refetch();
          void liveMatchesQuery.refetch();
          void highConfidenceQuery.refetch();
        }}
        loadingCount={4}
      >
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Bugunun mac sayisi"
            value={String(dashboard?.todayMatchCount ?? todayMatches.length)}
            hint="Guncel gun takvimi"
          />
          <StatCard
            title="Canli mac"
            value={String(dashboard?.liveMatchCount ?? liveMatches.length)}
            hint="Anlik takipteki maclar"
          />
          <StatCard
            title="Calibrated high confidence"
            value={String(dashboard?.calibratedHighConfidenceCount ?? dashboard?.highConfidencePredictionCount ?? topPredictions.length)}
            hint="Calibration sonrasi yuksek guven"
            tone="success"
          />
          <StatCard
            title="Low confidence"
            value={String(dashboard?.lowConfidenceCount ?? lowConfidencePredictions.length)}
            hint="Ek yorum gerektiren tahminler"
            tone="warning"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Sistem Performans Ozet Trendi" subtitle="Takim bazli mini trend alanlari">
            {trendSeries.length > 0 ? (
              <LineChart data={trendSeries} />
            ) : (
              <EmptyState title="Trend verisi yok" description="Model trend serileri gelince bu alan otomatik dolacak." />
            )}
          </SectionCard>

          <SectionCard title="Risk Dagilimi" subtitle="Low / medium / high prediction count">
            {(dashboard?.riskDistribution?.low ?? 0) + (dashboard?.riskDistribution?.medium ?? 0) + (dashboard?.riskDistribution?.high ?? 0) > 0 ? (
              <BarChart data={confidenceChartData} />
            ) : (
              <EmptyState title="Risk dagilimi yok" description="Risk dagilimi verisi su an paylasilmadi." />
            )}
          </SectionCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Calibration Health Summary" subtitle="Model calibration durum ozeti">
            {dashboard?.calibrationHealthSummary ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Status</p>
                  <p className="font-semibold text-[color:var(--foreground)]">{dashboard.calibrationHealthSummary.status ?? "-"}</p>
                </article>
                <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Avg confidence</p>
                  <p className="font-semibold text-[color:var(--foreground)]">{dashboard.avgConfidenceScore ?? "-"}%</p>
                </article>
                <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Brier score</p>
                  <p className="font-semibold text-[color:var(--foreground)]">{dashboard.calibrationHealthSummary.brierScore ?? "-"}</p>
                </article>
                <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">ECE</p>
                  <p className="font-semibold text-[color:var(--foreground)]">{dashboard.calibrationHealthSummary.ece ?? "-"}</p>
                </article>
                <article className="sm:col-span-2 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Not</p>
                  <p className="text-sm text-[color:var(--foreground)]">{dashboard.calibrationHealthSummary.note ?? "Not bulunmuyor."}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">Updated: {formatDateTime(dashboard.calibrationHealthSummary.updatedAt)}</p>
                </article>
              </div>
            ) : (
              <EmptyState title="Calibration ozeti yok" description="Calibration health summary endpoint verisi bekleniyor." />
            )}
          </SectionCard>

          <SectionCard title="Son Guncellenen Ligler" subtitle="Veri akisi son guncellenen ligler">
            {updatedLeagues.length > 0 ? (
              <ul className="space-y-2">
                {updatedLeagues.map((league) => (
                  <li key={league.id} className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2">
                    <p className="font-semibold text-[color:var(--foreground)]">{league.name}</p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {league.country} - {league.season}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">Guncelleme: {formatDateTime(league.updatedAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Lig guncellemesi yok" description="Son guncellenen lig bilgisi su an paylasilmadi." />
            )}
          </SectionCard>
        </section>

        <SectionCard title="Bugunun One Cikan Maclari" subtitle="Canli ve yaklasan maclar">
          {spotlightMatches.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {spotlightMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState title="Mac listesi bos" description="Bugun icin gosterilecek mac bulunmuyor." />
          )}
        </SectionCard>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Yuksek Guven Tahminleri" subtitle="Confidence score odakli model ciktilari">
            {topPredictions.length > 0 ? (
              <div className="grid gap-3">
                {topPredictions.map((prediction) => (
                  <PredictionCard key={prediction.id} prediction={prediction} />
                ))}
              </div>
            ) : (
              <EmptyState title="Yuksek guven tahmini yok" description="Bu saat araliginda confidence thresholdu asan tahmin yok." />
            )}
          </SectionCard>

          <SectionCard title="Low Confidence Tahminler" subtitle="Ek kontrol gerektiren tahminler">
            {lowConfidencePredictions.length > 0 ? (
              <div className="space-y-2">
                {lowConfidencePredictions.slice(0, 4).map((item) => (
                  <PredictionCard key={`low-${item.id}`} prediction={item} />
                ))}
              </div>
            ) : (
              <EmptyState title="Low confidence kayit yok" description="Su anda dusuk guvenli tahmin kaydi bulunmuyor." />
            )}
          </SectionCard>
        </section>

        <SectionCard title="Son Tahmin Ozet Tablosu" subtitle="Canli maclar ve recent predictions overview">
          {liveMatches.length > 0 || spotlightMatches.length > 0 ? (
            <RecentMatchesTable matches={liveMatches.length > 0 ? liveMatches : spotlightMatches.slice(0, 4)} />
          ) : (
            <EmptyState title="Tablo verisi yok" description="Ozet tabloda gosterilecek mac verisi bulunmuyor." />
          )}
        </SectionCard>
      </DataFeedback>
    </div>
  );
}

