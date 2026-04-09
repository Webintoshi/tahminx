"use client";

import type { ComparisonVisualizationData, TeamComparisonHeader } from "@/types/api-contract";
import { visualizationMetricEntries } from "@/lib/team-comparison";

export function ComparisonBarChart({
  visualization,
  header
}: {
  visualization: ComparisonVisualizationData;
  header: TeamComparisonHeader;
}) {
  const rows = visualizationMetricEntries(visualization);

  return (
    <div className="space-y-4" role="img" aria-label="Karsilastirma cizelge grafigi">
      {rows.map((row) => {
        const max = Math.max(row.home, row.away, 1);
        return (
          <div key={row.key} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
              <span>{row.label}</span>
              <span>{header.homeTeam.shortName || "EV"} {row.home.toFixed(0)} / {header.awayTeam.shortName || "DEP"} {row.away.toFixed(0)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-3 overflow-hidden rounded-full bg-[#1F2529]">
                <div className="h-full rounded-full bg-[#7A84FF]" style={{ width: `${(row.home / max) * 100}%` }} />
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#1F2529]">
                <div className="h-full rounded-full bg-[#34C759]" style={{ width: `${(row.away / max) * 100}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
