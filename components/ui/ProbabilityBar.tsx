import { clamp, toPercent } from "@/lib/utils";

export function ProbabilityBar({
  home,
  draw,
  away,
  title = "Olasilik Dagilimi"
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
      <div className="rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-2 text-xs text-[color:var(--muted)]">
        Olasilik verisi henuz olusmadi.
      </div>
    );
  }

  const homeWidth = (safeHome / total) * 100;
  const drawWidth = (safeDraw / total) * 100;
  const awayWidth = (safeAway / total) * 100;

  return (
    <div className="space-y-2" aria-label="Kazanim olasiligi barlari">
      <p className="text-xs text-[color:var(--muted)]">{title}</p>
      <div className="h-3 overflow-hidden rounded-full bg-[color:var(--surface-alt)]">
        <div className="flex h-full">
          <div style={{ width: `${homeWidth}%` }} className="bg-emerald-400/70" />
          {safeDraw > 0 ? <div style={{ width: `${drawWidth}%` }} className="bg-amber-400/70" /> : null}
          <div style={{ width: `${awayWidth}%` }} className="bg-sky-400/70" />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
        <span>Ev: {toPercent(safeHome)}</span>
        {safeDraw > 0 ? <span>Ber: {toPercent(safeDraw)}</span> : null}
        <span>Dep: {toPercent(safeAway)}</span>
      </div>
    </div>
  );
}

