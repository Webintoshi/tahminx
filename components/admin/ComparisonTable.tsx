import type { ModelComparisonItem } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";

const showValue = (value?: number | null, digits = 2, suffix = "") =>
  value == null || Number.isNaN(value) ? "-" : `${value.toFixed(digits)}${suffix}`;

export function ComparisonTable({ rows }: { rows: ModelComparisonItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
          <tr>
            <th className="px-3 py-2">Model</th>
            <th className="px-3 py-2">Sport</th>
            <th className="px-3 py-2">League</th>
            <th className="px-3 py-2">Accuracy</th>
            <th className="px-3 py-2">LogLoss</th>
            <th className="px-3 py-2">Brier</th>
            <th className="px-3 py-2">Avg Confidence</th>
            <th className="px-3 py-2">Calibration</th>
            <th className="px-3 py-2">Sample</th>
            <th className="px-3 py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={`${item.modelVersion}-${item.sportKey}-${item.leagueId ?? "all"}`} className="border-t border-[var(--border)]">
              <td className="px-3 py-2 font-semibold text-[color:var(--foreground)]">{item.modelVersion}</td>
              <td className="px-3 py-2">{item.sportKey}</td>
              <td className="px-3 py-2">{item.leagueName ?? "-"}</td>
              <td className="px-3 py-2">{showValue(item.accuracy, 1, "%")}</td>
              <td className="px-3 py-2">{showValue(item.logLoss, 3)}</td>
              <td className="px-3 py-2">{showValue(item.brierScore, 3)}</td>
              <td className="px-3 py-2">{showValue(item.avgConfidenceScore, 1, "%")}</td>
              <td className="px-3 py-2">{showValue(item.calibrationQuality, 1, "%")}</td>
              <td className="px-3 py-2">{showValue(item.sampleSize, 0)}</td>
              <td className="px-3 py-2">{formatDateTime(item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
