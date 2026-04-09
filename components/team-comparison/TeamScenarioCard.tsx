import type { TeamScenario } from "@/types/api-contract";
import { cn } from "@/lib/utils";

export function TeamScenarioCard({ scenario }: { scenario: TeamScenario }) {
  return (
    <article
      className={cn(
        "rounded-xl border p-4",
        scenario.favoredSide === "home"
          ? "border-[#7A84FF]/30 bg-[#7A84FF]/5"
          : scenario.favoredSide === "away"
            ? "border-[#34C759]/30 bg-[#34C759]/5"
            : "border-[#2A3035] bg-[#171C1F]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#ECEDEF]">{scenario.name}</h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            {scenario.favoredSide === "balanced"
              ? "Dengeli senaryo"
              : scenario.favoredSide === "home"
                ? "Ev sahibi lehine hafif kayma"
                : "Deplasman lehine hafif kayma"}
          </p>
        </div>
        <div className="rounded-full border border-[#2A3035] bg-[#171C1F] px-2.5 py-1 text-xs font-medium text-[#ECEDEF]">
          {scenario.probabilityScore.toFixed(0)}%
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Nedenler</p>
          <ul className="mt-2 space-y-1 text-sm text-[#ECEDEF]">
            {scenario.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">Destekleyici sinyaller</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {scenario.supportingSignals.map((signal) => (
              <span key={signal} className="rounded-full border border-[#2A3035] bg-[#171C1F] px-2.5 py-1 text-xs text-[#9CA3AF]">
                {signal}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
