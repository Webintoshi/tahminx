import type { TeamComparisonExplanation } from "@/types/api-contract";
import { SectionCard } from "@/components/ui/SectionCard";
import { ComparisonRiskList } from "@/components/team-comparison/ComparisonRiskList";
import { ComparisonMissingDataPanel } from "@/components/team-comparison/ComparisonMissingDataPanel";

export function ComparisonExplanationPanel({ explanation }: { explanation: TeamComparisonExplanation }) {
  return (
    <SectionCard
      title="Aciklanabilirlik"
      subtitle="Sayisal edge ve olasiliklar, dikkat notlariyla birlikte okunmali."
    >
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Kisa yorum</p>
            <p className="mt-2 text-sm leading-6 text-[#ECEDEF]">{explanation.shortComment}</p>
          </div>
          <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Detayli yorum</p>
            <p className="mt-2 text-sm leading-6 text-[#ECEDEF]">{explanation.detailedComment}</p>
          </div>
          <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Expert yorum</p>
            <p className="mt-2 text-sm leading-6 text-[#ECEDEF]">{explanation.expertComment}</p>
          </div>
          <div className="rounded-xl border border-[#2A3035] bg-[#1F2529] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Guven notu</p>
            <p className="mt-2 text-sm leading-6 text-[#ECEDEF]">{explanation.confidenceNote}</p>
          </div>
        </div>
        <div className="space-y-4">
          <ComparisonRiskList risks={explanation.risks} />
          <ComparisonMissingDataPanel notes={explanation.missingDataNotes} />
        </div>
      </div>
    </SectionCard>
  );
}
