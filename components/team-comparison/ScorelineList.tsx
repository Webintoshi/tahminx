import type { ScorelineProbability } from "@/types/api-contract";
import { EmptyState } from "@/components/states/EmptyState";

export function ScorelineList({ scorelines }: { scorelines: ScorelineProbability[] }) {
  if (!scorelines.length) {
    return (
      <EmptyState
        title="Skor dagilimi yok"
        description="Skor satiri olasiliklari bu cevapta uretilmedi."
      />
    );
  }

  return (
    <div className="space-y-3">
      {scorelines.map((scoreline) => (
        <div key={scoreline.score} className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#ECEDEF]">{scoreline.score}</span>
            <span className="text-sm text-[#9CA3AF]">{scoreline.probability.toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1F2529]">
            <div className="h-full rounded-full bg-[#7A84FF]" style={{ width: `${Math.max(2, Math.min(100, scoreline.probability))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
