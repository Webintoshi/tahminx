"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataFeedback } from "@/components/states/DataFeedback";
import { EmptyState } from "@/components/states/EmptyState";
import { useCalibrationResults, useRunCalibrationMutation } from "@/lib/hooks/use-api";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

export default function AdminCalibrationPage() {
  const resultsQuery = useCalibrationResults();
  const runMutation = useRunCalibrationMutation();
  const { showToast } = useToast();

  const results = resultsQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Calibration"
        description="Calibration sonuclari ve manuel run islemi"
        actions={
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2 text-sm font-semibold"
            disabled={runMutation.isPending}
            onClick={() => {
              runMutation.mutate(undefined, {
                onSuccess: (response) => {
                  showToast({
                    tone: "success",
                    title: "Calibration tetiklendi",
                    description: response.data.message ?? "Calibration run istegi gonderildi."
                  });
                },
                onError: (error) => {
                  showToast({
                    tone: "error",
                    title: "Calibration baslatilamadi",
                    description: error instanceof Error ? error.message : "Bilinmeyen hata"
                  });
                }
              });
            }}
          >
            {runMutation.isPending ? "Calisiyor..." : "Calibration Run"}
          </button>
        }
      />

      <SectionCard title="Calibration Sonuclari" subtitle="Admin endpoint: /api/v1/admin/calibration/results">
        <DataFeedback
          isLoading={resultsQuery.isLoading}
          error={resultsQuery.error as Error | undefined}
          isEmpty={results.length === 0}
          emptyTitle="Calibration sonucu bulunamadi"
          emptyDescription="Sistem henuz calibration sonucu dondurmuyor."
          onRetry={() => void resultsQuery.refetch()}
          loadingVariant="table"
          loadingCount={5}
        >
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Run</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Sample</th>
                  <th className="px-3 py-2">Brier</th>
                  <th className="px-3 py-2">ECE</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{item.id}</td>
                    <td className="px-3 py-2">{item.status ?? "-"}</td>
                    <td className="px-3 py-2">{item.sampleSize ?? "-"}</td>
                    <td className="px-3 py-2">{item.brierScore ?? "-"}</td>
                    <td className="px-3 py-2">{item.ece ?? "-"}</td>
                    <td className="px-3 py-2">{formatDateTime(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {runMutation.data?.data ? (
            <EmptyState
              title="Son Calibration Run"
              description={`RunId: ${runMutation.data.data.runId ?? "-"} - Status: ${runMutation.data.data.status ?? "-"}`}
            />
          ) : null}
        </DataFeedback>
      </SectionCard>
    </div>
  );
}

