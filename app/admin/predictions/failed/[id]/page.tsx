"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { EmptyState } from "@/components/states/EmptyState";
import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { useFailedPredictionDetail } from "@/lib/hooks/use-api";
import { formatDateTime } from "@/lib/utils";

type HeuristicKey =
  | "missingDataImpact"
  | "staleStatsImpact"
  | "modelDisagreementImpact"
  | "upsetScenario"
  | "weakMappingConfidence"
  | "injuryUncertainty";

const heuristicLabels: Array<{ key: HeuristicKey; label: string }> = [
  { key: "missingDataImpact", label: "Missing Data Impact" },
  { key: "staleStatsImpact", label: "Stale Stats Impact" },
  { key: "modelDisagreementImpact", label: "Model Disagreement Impact" },
  { key: "upsetScenario", label: "Upset Scenario" },
  { key: "weakMappingConfidence", label: "Weak Mapping Confidence" },
  { key: "injuryUncertainty", label: "Injury Uncertainty" }
];

function mapHeuristic(detail: { heuristicAnalysis?: Record<string, string | null | undefined> | null } | undefined) {
  return (detail?.heuristicAnalysis ?? {}) as Partial<Record<HeuristicKey, string | null | undefined>>;
}

export default function AdminFailedPredictionDetailPage() {
  const params = useParams<{ id: string }>();
  const detailQuery = useFailedPredictionDetail(params.id);

  const detail = detailQuery.data?.data;
  const heuristic = mapHeuristic(detail);

  return (
    <div className="space-y-5">
      <PageHeader
        title={detail ? `Failed Prediction ${detail.id}` : "Failed Prediction Detay"}
        description="Prediction vs actual sonucu ve heuristic analysis bloklari"
        actions={
          <Link href="/admin/predictions/failed" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            Listeye Don
          </Link>
        }
      />

      <DataFeedback
        isLoading={detailQuery.isLoading}
        error={detailQuery.error as Error | undefined}
        isEmpty={!detail}
        emptyTitle="Failed prediction detayi bulunamadi"
        emptyDescription="Detay endpoint'i secili kayit icin veri dondurmedi."
        onRetry={() => void detailQuery.refetch()}
      >
        {detail ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs text-[color:var(--muted)]">Mac</p>
                <p className="font-semibold text-[color:var(--foreground)]">{detail.matchLabel}</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs text-[color:var(--muted)]">Prediction</p>
                <p className="font-semibold text-[color:var(--foreground)]">{detail.predictedResult}</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs text-[color:var(--muted)]">Actual</p>
                <p className="font-semibold text-[color:var(--foreground)]">{detail.actualResult}</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-xs text-[color:var(--muted)]">Updated</p>
                <p className="font-semibold text-[color:var(--foreground)]">{formatDateTime(detail.updatedAt)}</p>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard title="Prediction vs Actual" subtitle="Confidence, score ve olasilik karsilastirmasi">
                <div className="space-y-4">
                  <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">Expected Score</p>
                    <p className="font-semibold text-[color:var(--foreground)]">
                      {detail.expectedScore?.home ?? "-"} - {detail.expectedScore?.away ?? "-"}
                    </p>
                  </article>

                  <article className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">Confidence Score</p>
                    <ConfidenceGauge value={detail.confidenceScore ?? null} />
                  </article>

                  {(detail.riskFlags ?? []).length > 0 ? (
                    <article className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-100">Risk Flags</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {(detail.riskFlags ?? []).map((flag, index) => (
                          <li key={`${flag}-${index}`} className="rounded-md border border-amber-500/35 px-2 py-1 text-[11px] text-amber-100">
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ) : (
                    <EmptyState title="Risk flag yok" description="Bu kayitta riskFlags alaninda veri yok." />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Probabilities" subtitle="Tahmin olasilik dagilimi">
                {detail.probabilities ? (
                  <ProbabilityBar
                    home={detail.probabilities.home}
                    draw={detail.probabilities.draw}
                    away={detail.probabilities.away}
                  />
                ) : (
                  <EmptyState title="Probability verisi yok" description="Bu kayitta probabilities alanlari eksik." />
                )}

                <article className="mt-3 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Failure reason summary</p>
                  <p className="text-sm text-[color:var(--foreground)]">{detail.failureReasonSummary ?? "Aciklama bulunmuyor."}</p>
                </article>

                <article className="mt-3 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] p-3">
                  <p className="text-xs text-[color:var(--muted)]">Analyst summary</p>
                  <p className="text-sm text-[color:var(--foreground)]">{detail.summary ?? "Detay summary bulunmuyor."}</p>
                </article>
              </SectionCard>
            </section>

            <SectionCard title="Heuristic Analysis" subtitle="Failure cause impact bloklari">
              <div className="grid gap-3 md:grid-cols-2">
                {heuristicLabels.map((item) => (
                  <article key={item.key} className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
                    <p className="text-xs text-[color:var(--muted)]">{item.label}</p>
                    <p className="mt-1 text-sm text-[color:var(--foreground)]">{heuristic[item.key] ?? "Bu baslik icin aciklama bulunmuyor."}</p>
                  </article>
                ))}
              </div>
            </SectionCard>
          </>
        ) : null}
      </DataFeedback>
    </div>
  );
}
