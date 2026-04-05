import type { DriftSummary } from "@/types/api-contract";
import { cn } from "@/lib/utils";

const metricLabel: Record<string, string> = {
  accuracy: "Accuracy",
  logLoss: "LogLoss",
  brierScore: "Brier Score",
  avgConfidenceScore: "Avg Confidence",
  calibrationQuality: "Calibration Quality"
};

const deltaTone = (delta?: number | null) => {
  if (delta == null) return "text-[color:var(--muted)]";
  if (delta > 0) return "text-amber-300";
  if (delta < 0) return "text-emerald-300";
  return "text-[color:var(--muted)]";
};

export function DriftSummaryCard({ summary }: { summary: DriftSummary }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
      <p className="text-xs text-[color:var(--muted)]">{metricLabel[summary.metric] ?? summary.metric}</p>
      <p className="mt-1 text-sm text-[color:var(--foreground)]">7 Gun: {summary.recent7d ?? "-"}</p>
      <p className="text-sm text-[color:var(--foreground)]">Onceki 30 Gun: {summary.previous30d ?? "-"}</p>
      <p className={cn("mt-1 text-xs font-semibold", deltaTone(summary.delta))}>
        Delta: {summary.delta == null ? "-" : `${summary.delta > 0 ? "+" : ""}${summary.delta.toFixed(2)}`}
      </p>
      <p className="mt-1 text-xs text-[color:var(--muted)]">Durum: {summary.status ?? "stable"}</p>
    </article>
  );
}
