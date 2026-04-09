import type { TeamComparisonResponse } from "@/types/api-contract";
import { TeamComparisonMetricCard } from "@/components/team-comparison/TeamComparisonMetricCard";

export function TeamComparisonGrid({
  comparison,
  homeLabel,
  awayLabel
}: {
  comparison: TeamComparisonResponse["comparison"];
  homeLabel: string;
  awayLabel: string;
}) {
  const cards = [
    comparison.overallStrength,
    comparison.attack,
    comparison.defense,
    comparison.form,
    comparison.homeAway,
    comparison.tempo,
    comparison.setPiece,
    comparison.transition,
    comparison.squadIntegrity
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <TeamComparisonMetricCard key={card.key} card={card} homeLabel={homeLabel} awayLabel={awayLabel} />
      ))}
    </div>
  );
}
