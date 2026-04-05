import type { FeatureExperimentResult } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";

const valueText = (value?: number | null, digits = 3, suffix = "") =>
  value == null || Number.isNaN(value) ? "-" : `${value.toFixed(digits)}${suffix}`;

export function ExperimentResultsTable({ rows }: { rows: FeatureExperimentResult[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--surface-alt)] text-left text-xs uppercase tracking-[0.08em] text-[color:var(--muted)]">
          <tr>
            <th className="px-3 py-2">Feature Set</th>
            <th className="px-3 py-2">Model</th>
            <th className="px-3 py-2">League</th>
            <th className="px-3 py-2">Accuracy</th>
            <th className="px-3 py-2">LogLoss</th>
            <th className="px-3 py-2">Brier</th>
            <th className="px-3 py-2">Sample</th>
            <th className="px-3 py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr
              key={item.id}
              className={`border-t border-[var(--border)] ${item.isWinner ? "bg-emerald-500/10" : ""}`}
            >
              <td className="px-3 py-2 font-semibold text-[color:var(--foreground)]">
                {item.featureSetName ?? item.featureSetId}
                {item.isWinner ? <span className="ml-2 rounded-md border border-emerald-500/35 px-1.5 py-0.5 text-[11px] text-emerald-200">Winner</span> : null}
              </td>
              <td className="px-3 py-2">{item.modelVersion}</td>
              <td className="px-3 py-2">{item.leagueName ?? item.leagueId}</td>
              <td className="px-3 py-2">{valueText(item.accuracy, 1, "%")}</td>
              <td className="px-3 py-2">{valueText(item.logLoss)}</td>
              <td className="px-3 py-2">{valueText(item.brierScore)}</td>
              <td className="px-3 py-2">{valueText(item.sampleSize, 0)}</td>
              <td className="px-3 py-2">{formatDateTime(item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
