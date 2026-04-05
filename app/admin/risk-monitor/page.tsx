"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { EmptyState } from "@/components/states/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { usePredictionRiskSummary } from "@/lib/hooks/use-api";
import { LoadingSkeleton } from "@/components/states/LoadingSkeleton";
import { formatDateTime } from "@/lib/utils";

const BarChart = dynamic(() => import("@/components/charts/BarChart").then((mod) => mod.BarChart), {
  ssr: false,
  loading: () => <LoadingSkeleton className="h-44" />
});

export default function AdminRiskMonitorPage() {
  const riskSummaryQuery = usePredictionRiskSummary();
  const summary = riskSummaryQuery.data?.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Risk Monitor"
        description="Risk dagilimi, calibration health ve bayrak frekanslari"
      />

      <DataFeedback
        isLoading={riskSummaryQuery.isLoading}
        error={riskSummaryQuery.error as Error | undefined}
        isEmpty={!summary}
        emptyTitle="Risk ozeti bulunamadi"
        emptyDescription="Risk summary endpoint su an veri dondurmuyor."
        onRetry={() => void riskSummaryQuery.refetch()}
      >
        {summary ? (
          <>
            <section className="grid gap-3 sm:grid-cols-4">
              <StatCard title="Total Predictions" value={String(summary.totalPredictions ?? 0)} />
              <StatCard title="Low Risk" value={String(summary.low ?? 0)} tone="success" />
              <StatCard title="Medium Risk" value={String(summary.medium ?? 0)} />
              <StatCard title="High Risk" value={String(summary.high ?? 0)} tone="warning" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <SectionCard title="Risk Dagilimi" subtitle="Admin endpoint: /api/v1/admin/predictions/risk-summary">
                {(summary.low ?? 0) + (summary.medium ?? 0) + (summary.high ?? 0) > 0 ? (
                  <BarChart
                    data={[
                      { label: "Low", value: summary.low ?? 0 },
                      { label: "Medium", value: summary.medium ?? 0 },
                      { label: "High", value: summary.high ?? 0 }
                    ]}
                  />
                ) : (
                  <EmptyState title="Dagilim verisi yok" description="Risk dagilim verisi henuz olusmadi." />
                )}
              </SectionCard>

              <SectionCard title="Calibration Health" subtitle="Risk summary icindeki calibration ozeti">
                {summary.calibrationHealthSummary ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <p className="text-xs text-[color:var(--muted)]">Status</p>
                      <p className="font-semibold text-[color:var(--foreground)]">{summary.calibrationHealthSummary.status ?? "-"}</p>
                    </article>
                    <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <p className="text-xs text-[color:var(--muted)]">Brier</p>
                      <p className="font-semibold text-[color:var(--foreground)]">{summary.calibrationHealthSummary.brierScore ?? "-"}</p>
                    </article>
                    <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <p className="text-xs text-[color:var(--muted)]">ECE</p>
                      <p className="font-semibold text-[color:var(--foreground)]">{summary.calibrationHealthSummary.ece ?? "-"}</p>
                    </article>
                    <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <p className="text-xs text-[color:var(--muted)]">Updated</p>
                      <p className="font-semibold text-[color:var(--foreground)]">{formatDateTime(summary.updatedAt)}</p>
                    </article>
                    <article className="sm:col-span-2 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                      <p className="text-xs text-[color:var(--muted)]">Not</p>
                      <p className="text-sm text-[color:var(--foreground)]">{summary.calibrationHealthSummary.note ?? "Not bulunmuyor."}</p>
                    </article>
                  </div>
                ) : (
                  <EmptyState title="Calibration ozeti yok" description="Bu endpointte calibration health bilgisi paylasilmadi." />
                )}
              </SectionCard>
            </section>

            <SectionCard title="Top Risk Flags" subtitle="En sik gorulen risk bayraklari">
              {(summary.riskFlagsTop ?? []).length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(summary.riskFlagsTop ?? []).map((flag) => (
                    <li key={flag.flag} className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2">
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">{flag.flag}</p>
                      <p className="text-xs text-[color:var(--muted)]">{flag.count} kayit</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Risk flag kaydi yok" description="Risk flag dagilim listesi su an bos." />
              )}
            </SectionCard>
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}

