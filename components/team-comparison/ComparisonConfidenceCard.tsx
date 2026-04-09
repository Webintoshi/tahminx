import type { TeamComparisonConfidence, TeamComparisonMetadata } from "@/types/api-contract";
import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ComparisonConfidenceCard({
  confidence,
  metadata
}: {
  confidence: TeamComparisonConfidence;
  metadata: TeamComparisonMetadata;
}) {
  const metrics = [
    { label: "Data quality", value: confidence.dataQuality },
    { label: "Data coverage", value: confidence.dataCoverage },
    { label: "Window consistency", value: confidence.windowConsistency },
    { label: "Mapping confidence", value: confidence.mappingConfidence }
  ];

  return (
    <SectionCard
      title="Confidence"
      subtitle="Skor; veri kapsami, esleme kalitesi ve pencere tutarliligi ile birlikte okunmali."
      action={<StatusBadge status={confidence.band} />}
    >
      <div className="space-y-4">
        <ConfidenceGauge value={confidence.score} />
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
              <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold text-[#ECEDEF]">{metric.value.toFixed(0)}%</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4 text-sm text-[#9CA3AF]">
          <p>Generated: <span className="text-[#ECEDEF]">{metadata.generatedAt}</span></p>
          <p className="mt-1">
            Cache: <span className="text-[#ECEDEF]">{metadata.cacheHit ? `Hit (${metadata.cacheSource || "cache"})` : "Fresh response"}</span>
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
