import type { TeamComparisonHeader, TeamComparisonMetadata } from "@/types/api-contract";
import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { SectionCard } from "@/components/ui/SectionCard";
import { TeamMiniBadge } from "@/components/team-comparison/TeamMiniBadge";
import { formatDateTime } from "@/lib/utils";

export function TeamComparisonHeaderCard({
  header,
  metadata
}: {
  header: TeamComparisonHeader;
  metadata: TeamComparisonMetadata;
}) {
  return (
    <SectionCard
      title="Header summary"
      subtitle="Karsilastirma, secilen takimlar ve veri penceresi uzerinden olusturuldu."
    >
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <TeamMiniBadge
            name={header.homeTeam.name}
            shortName={header.homeTeam.shortName}
            logoUrl={header.homeTeam.logoUrl}
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#2A3035] bg-[#1F2529] text-sm font-semibold text-[#ECEDEF]">
            VS
          </div>
          <TeamMiniBadge
            name={header.awayTeam.name}
            shortName={header.awayTeam.shortName}
            logoUrl={header.awayTeam.logoUrl}
            align="right"
          />
        </div>
        <div className="space-y-3 rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Comparison date</p>
            <p className="mt-1 text-sm font-medium text-[#ECEDEF]">{formatDateTime(header.comparisonDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Window</p>
            <p className="mt-1 text-sm font-medium text-[#ECEDEF]">{header.dataWindow}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">League context</p>
            <p className="mt-1 text-sm font-medium text-[#ECEDEF]">{header.leagueContext}</p>
          </div>
          <ConfidenceGauge value={header.confidenceScore} />
          {metadata.cacheHit ? (
            <p className="text-xs text-[#9CA3AF]">
              Cache yaniti kullanildi{metadata.cacheExpiresAt ? `, bitis: ${formatDateTime(metadata.cacheExpiresAt)}` : ""}.
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
