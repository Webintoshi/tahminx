"use client";

import { ComparisonRadarChart as BaseComparisonRadarChart } from "@/components/charts/ComparisonRadarChart";
import type { ComparisonVisualizationData, TeamComparisonHeader } from "@/types/api-contract";
import { visualizationMetricEntries } from "@/lib/team-comparison";

export function ComparisonRadarChart({
  visualization,
  header
}: {
  visualization: ComparisonVisualizationData;
  header: TeamComparisonHeader;
}) {
  const values = visualizationMetricEntries(visualization).map((item) => ({
    label: item.label,
    home: Number(item.home.toFixed(0)),
    away: Number(item.away.toFixed(0))
  }));

  return (
    <div>
      <BaseComparisonRadarChart values={values} />
      <p className="mt-3 text-sm text-[#9CA3AF]">
        Radar ozeti: {header.homeTeam.name} ile {header.awayTeam.name} arasindaki kategori dagilimi.
      </p>
    </div>
  );
}
