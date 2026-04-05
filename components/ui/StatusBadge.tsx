import type { MatchStatus } from "@/types/api-contract";
import { cn, getStatusLabel } from "@/lib/utils";

type BadgeStatus = MatchStatus | "low" | "medium" | "high" | "neutral" | "recommended" | "low-confidence";

const styleMap: Record<BadgeStatus, string> = {
  live: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  completed: "border-slate-500/40 bg-slate-500/15 text-slate-300",
  scheduled: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  postponed: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  cancelled: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  low: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  high: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  neutral: "border-[var(--border)] bg-[color:var(--surface-alt)] text-[color:var(--muted)]",
  recommended: "border-teal-500/40 bg-teal-500/15 text-teal-300",
  "low-confidence": "border-orange-500/40 bg-orange-500/15 text-orange-300"
};

const getLabel = (status: BadgeStatus) => {
  if (status === "low") return "Dusuk Risk";
  if (status === "medium") return "Orta Risk";
  if (status === "high") return "Yuksek Risk";
  if (status === "neutral") return "Bilgi";
  if (status === "recommended") return "Onerilen";
  if (status === "low-confidence") return "Dusuk Guven";
  return getStatusLabel(status);
};

export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  const normalized = status in styleMap ? status : "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em]",
        styleMap[normalized],
        className
      )}
      aria-label={`Durum: ${getLabel(normalized)}`}
    >
      {getLabel(normalized)}
    </span>
  );
}

