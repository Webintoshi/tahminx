import { clamp } from "@/lib/utils";

export function ConfidenceGauge({
  value,
  showLabel = true
}: {
  value?: number | null;
  showLabel?: boolean;
}) {
  const hasValue = value != null && Number.isFinite(value);
  const bounded = clamp(value ?? 0, 0, 100);

  const quality = !hasValue
    ? "Bilinmiyor"
    : bounded >= 80
      ? "Yuksek"
      : bounded >= 67
        ? "Orta"
        : "Dusuk";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--muted)]">
        <span>Confidence</span>
        {showLabel ? <span>{quality}</span> : null}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-alt)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(bounded)}
          aria-label="Guven skoru"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[color:var(--warning)] via-[color:var(--accent)] to-[color:var(--success)]"
            style={{ width: `${bounded}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-[color:var(--foreground)]">{hasValue ? `${bounded.toFixed(0)}%` : "-"}</span>
      </div>
    </div>
  );
}

