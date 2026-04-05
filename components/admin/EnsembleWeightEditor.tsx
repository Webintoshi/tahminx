import { useMemo } from "react";
import type { EnsembleConfig, EnsembleWeight } from "@/types/api-contract";

export function EnsembleWeightEditor({
  config,
  draft,
  saving,
  onChange,
  onNormalize,
  onSave
}: {
  config: EnsembleConfig;
  draft: EnsembleWeight[];
  saving?: boolean;
  onChange: (model: string, nextWeight: number) => void;
  onNormalize: () => void;
  onSave: () => void;
}) {
  const total = useMemo(() => draft.reduce((sum, item) => sum + item.weight, 0), [draft]);
  const normalized = Math.abs(total - 1) <= 0.001;

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            {config.leagueName ?? "Tum ligler"} - {config.modelVersion ?? "-"}
          </p>
          <p className="text-xs text-[color:var(--muted)]">{config.sportKey}</p>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-[11px] ${
            normalized
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/35 bg-amber-500/10 text-amber-200"
          }`}
        >
          Total: {total.toFixed(3)}
        </span>
      </div>

      <div className="space-y-3">
        {draft.map((item) => (
          <label key={item.model} className="grid gap-2 sm:grid-cols-[130px_1fr_90px] sm:items-center">
            <span className="text-sm text-[color:var(--foreground)]">{item.model}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={item.weight}
              onChange={(event) => onChange(item.model, Number(event.target.value))}
              className="w-full"
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={item.weight}
              onChange={(event) => onChange(item.model, Number(event.target.value))}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[color:var(--surface-alt)] px-2 text-sm"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onNormalize}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
        >
          Normalize
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 py-1.5 text-sm"
        >
          {saving ? "Saving..." : "Kaydet"}
        </button>
      </div>
    </article>
  );
}
