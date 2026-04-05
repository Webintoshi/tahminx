import { LineChart } from "@/components/charts/LineChart";
import type { ModelPerformancePoint } from "@/types/api-contract";
import { formatDate } from "@/lib/utils";

type MetricKey = "accuracy" | "logLoss" | "brierScore" | "avgConfidenceScore";

export function PerformanceTrendChart({
  points,
  metric,
  title
}: {
  points: ModelPerformancePoint[];
  metric: MetricKey;
  title: string;
}) {
  const data = [...points]
    .filter((point) => point[metric] != null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((point) => ({
      label: formatDate(point.timestamp),
      value: Number(point[metric])
    }));

  if (data.length === 0) {
    return (
      <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Trend verisi bulunmuyor.</p>
      </article>
    );
  }

  const latest = data[data.length - 1]?.value;

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-3">
      <div className="mb-2 flex items-end justify-between gap-2">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h3>
        <p className="text-xs text-[color:var(--muted)]">Son: {latest?.toFixed(metric === "accuracy" || metric === "avgConfidenceScore" ? 1 : 3)}</p>
      </div>
      <LineChart data={data} height={150} />
    </article>
  );
}
