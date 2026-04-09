import { clamp, toPercent } from "@/lib/utils";

export function ComparisonEdgeBar({
  homeScore,
  awayScore,
  homeLabel,
  awayLabel
}: {
  homeScore: number;
  awayScore: number;
  homeLabel: string;
  awayLabel: string;
}) {
  const total = Math.max(homeScore + awayScore, 1);
  const homeWidth = clamp((homeScore / total) * 100, 0, 100);
  const awayWidth = clamp((awayScore / total) * 100, 0, 100);

  return (
    <div className="space-y-2" aria-label="Kategori edge bar">
      <div className="h-2 overflow-hidden rounded-full bg-[#1F2529]">
        <div className="flex h-full">
          <div className="bg-[#7A84FF]" style={{ width: `${homeWidth}%` }} />
          <div className="bg-[#34C759]" style={{ width: `${awayWidth}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
        <span>{homeLabel}: {toPercent(homeScore, 0)}</span>
        <span>{awayLabel}: {toPercent(awayScore, 0)}</span>
      </div>
    </div>
  );
}
