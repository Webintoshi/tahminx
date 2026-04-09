import type { TeamScenario } from "@/types/api-contract";
import { EmptyState } from "@/components/states/EmptyState";
import { TeamScenarioCard } from "@/components/team-comparison/TeamScenarioCard";

export function TeamScenarioList({ scenarios }: { scenarios: TeamScenario[] }) {
  if (!scenarios.length) {
    return (
      <EmptyState
        title="Senaryo bulunamadi"
        description="Bu karsilastirma icin belirgin senaryo sinyali olusmadi."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {scenarios.slice(0, 3).map((scenario) => (
        <TeamScenarioCard key={scenario.name} scenario={scenario} />
      ))}
    </div>
  );
}
