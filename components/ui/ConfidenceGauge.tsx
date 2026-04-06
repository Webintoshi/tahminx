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
      ? "Yüksek"
      : bounded >= 67
        ? "Orta"
        : "Düşük";

  const qualityColor = !hasValue
    ? "#9CA3AF"
    : bounded >= 80
      ? "#34C759"
      : bounded >= 67
        ? "#7A84FF"
        : "#FF9500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-[#9CA3AF]">
        <span>Confidence</span>
        {showLabel ? <span style={{ color: qualityColor }}>{quality}</span> : null}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[#1F2529]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(bounded)}
          aria-label="Guven skoru"
        >
          <div
            className="h-full rounded-full bg-[#7A84FF] transition-all duration-500"
            style={{ width: `${bounded}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-[#ECEDEF]">{hasValue ? `${bounded.toFixed(0)}%` : "-"}</span>
      </div>
    </div>
  );
}
