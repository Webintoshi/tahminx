import type { TeamComparisonCard } from "@/types/api-contract";
import { ComparisonEdgeBar } from "@/components/team-comparison/ComparisonEdgeBar";

export function TeamComparisonMetricCard({
  card,
  homeLabel,
  awayLabel
}: {
  card: TeamComparisonCard;
  homeLabel: string;
  awayLabel: string;
}) {
  return (
    <article className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#ECEDEF]">{card.label}</h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">{card.winnerLabel}</p>
        </div>
        <div className="rounded-full border border-[#2A3035] bg-[#1F2529] px-2.5 py-1 text-xs font-medium text-[#ECEDEF]">
          Edge {card.edge > 0 ? "+" : ""}{card.edge}
        </div>
      </div>
      <div className="mt-4">
        <ComparisonEdgeBar homeScore={card.homeScore} awayScore={card.awayScore} homeLabel={homeLabel} awayLabel={awayLabel} />
      </div>
      <p className="mt-4 text-sm leading-6 text-[#9CA3AF]">{card.explanation}</p>
    </article>
  );
}
