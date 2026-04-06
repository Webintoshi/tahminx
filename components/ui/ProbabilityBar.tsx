import { clamp, toPercent } from "@/lib/utils";

export function ProbabilityBar({
  home,
  draw,
  away,
  title = "Olasılık Dağılımı"
}: {
  home?: number | null;
  draw?: number | null;
  away?: number | null;
  title?: string;
}) {
  const safeHome = clamp(home ?? 0, 0, 100);
  const safeDraw = clamp(draw ?? 0, 0, 100);
  const safeAway = clamp(away ?? 0, 0, 100);
  const total = safeHome + safeDraw + safeAway;

  if (total <= 0) {
    return (
      <div className="rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-2 text-xs text-[#9CA3AF]">
        Olasılık verisi henüz oluşmadı.
      </div>
    );
  }

  const homeWidth = (safeHome / total) * 100;
  const drawWidth = (safeDraw / total) * 100;
  const awayWidth = (safeAway / total) * 100;

  return (
    <div className="space-y-2" aria-label="Kazanim olasiligi barlari">
      <p className="text-xs text-[#9CA3AF]">{title}</p>
      <div className="h-2 overflow-hidden rounded-full bg-[#1F2529]">
        <div className="flex h-full">
          <div style={{ width: `${homeWidth}%` }} className="bg-[#34C759]" />
          {safeDraw > 0 ? <div style={{ width: `${drawWidth}%` }} className="bg-[#FF9500]" /> : null}
          <div style={{ width: `${awayWidth}%` }} className="bg-[#7A84FF]" />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
        <span>Ev: {toPercent(safeHome)}</span>
        {safeDraw > 0 ? <span>Ber: {toPercent(safeDraw)}</span> : null}
        <span>Dep: {toPercent(safeAway)}</span>
      </div>
    </div>
  );
}
