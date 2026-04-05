import type { FeatureContribution } from "@/types/api-contract";

const directionLabel = (direction?: string) => {
  if (direction === "positive") return "Pozitif";
  if (direction === "negative") return "Negatif";
  if (direction === "neutral") return "Notr";
  return "-";
};

export function FeatureImportanceChart({ items }: { items: FeatureContribution[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-[color:var(--muted)]">Feature importance verisi bulunmuyor.</p>;
  }

  const max = Math.max(...items.map((item) => item.score), 0.0001);

  return (
    <div className="space-y-3" role="img" aria-label="Feature importance chart">
      {items.map((item) => (
        <article key={item.feature} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <p className="font-semibold text-[color:var(--foreground)]">{item.feature}</p>
            <p className="text-[color:var(--muted)]">
              {item.score.toFixed(3)} ({directionLabel(item.direction)})
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--surface-alt)]">
            <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${(item.score / max) * 100}%` }} />
          </div>
          {item.description ? <p className="text-xs text-[color:var(--muted)]">{item.description}</p> : null}
        </article>
      ))}
    </div>
  );
}
