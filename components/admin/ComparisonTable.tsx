import type { ModelComparisonItem } from "@/types/api-contract";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const showValue = (value?: number | null, digits = 2, suffix = "") =>
  value == null || Number.isNaN(value) ? "-" : `${value.toFixed(digits)}${suffix}`;

export function ComparisonTable({ rows }: { rows: ModelComparisonItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2A3035]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1F2529]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Sport</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">League</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Accuracy</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">LogLoss</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Brier</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Avg Conf</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Calibration</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Sample</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr 
              key={`${item.modelVersion}-${item.sportKey}-${item.leagueId ?? "all"}`} 
              className={cn(
                "transition-colors hover:bg-[#2A3035]/50",
                index % 2 === 0 ? "bg-[#171C1F]" : "bg-[#1F2529]"
              )}
            >
              <td className="px-4 py-3.5 font-semibold text-[#ECEDEF]">{item.modelVersion}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.sportKey}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{item.leagueName ?? "-"}</td>
              <td className="px-4 py-3.5 font-medium text-[#34C759]">{showValue(item.accuracy, 1, "%")}</td>
              <td className="px-4 py-3.5 text-[#ECEDEF]">{showValue(item.logLoss, 3)}</td>
              <td className="px-4 py-3.5 text-[#ECEDEF]">{showValue(item.brierScore, 3)}</td>
              <td className="px-4 py-3.5 text-[#7A84FF]">{showValue(item.avgConfidenceScore, 1, "%")}</td>
              <td className="px-4 py-3.5 text-[#ECEDEF]">{showValue(item.calibrationQuality, 1, "%")}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{showValue(item.sampleSize, 0)}</td>
              <td className="px-4 py-3.5 text-[#9CA3AF]">{formatDateTime(item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
