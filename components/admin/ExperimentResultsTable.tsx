import type { FeatureExperimentResult } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const valueText = (value?: number | null, digits = 3, suffix = "") =>
  value == null || Number.isNaN(value) ? "-" : `${value.toFixed(digits)}${suffix}`;

export function ExperimentResultsTable({ rows }: { rows: FeatureExperimentResult[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2A3035]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1F2529]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Feature Set</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">League</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Accuracy</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">LogLoss</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Brier</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Sample</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr
              key={item.id}
              className={cn(
                "transition-colors hover:bg-[#2A3035]/50",
                index % 2 === 0 ? "bg-[#171C1F]" : "bg-[#1F2529]",
                item.isWinner && "border-l-2 border-l-[#34C759]"
              )}
            >
              <td className="px-4 py-3.5 font-semibold text-[#ECEDEF]">
                {item.featureSetName ?? item.featureSetId}
                {item.isWinner ? (
                  <span className="ml-2 rounded-lg border border-[#34C759]/30 bg-[#34C759]/10 px-2 py-0.5 text-[11px] font-medium text-[#34C759]">
                    Winner
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.modelVersion}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.leagueName ?? item.leagueId}</td>
              <td className="px-4 py-3.5 font-medium text-[#34C759]">{valueText(item.accuracy, 1, "%")}</td>
              <td className="px-4 py-3.5 text-[#ECEDEF]">{valueText(item.logLoss)}</td>
              <td className="px-4 py-3.5 text-[#ECEDEF]">{valueText(item.brierScore)}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{valueText(item.sampleSize, 0)}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{formatDateTime(item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
