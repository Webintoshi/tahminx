import type { MatchStatus } from "@/types/api-contract";
import { cn, getStatusLabel } from "@/lib/utils";

type BadgeStatus = MatchStatus | "low" | "medium" | "high" | "neutral" | "recommended" | "low-confidence";

const styleMap: Record<BadgeStatus, string> = {
  live: "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30",
  completed: "bg-[#9CA3AF]/15 text-[#9CA3AF] border-[#9CA3AF]/30",
  scheduled: "bg-[#7A84FF]/15 text-[#7A84FF] border-[#7A84FF]/30",
  postponed: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
  cancelled: "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30",
  low: "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30",
  medium: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
  high: "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30",
  neutral: "bg-[#1F2529] text-[#9CA3AF] border-[#2A3035]",
  recommended: "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30",
  "low-confidence": "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30"
};

const getLabel = (status: BadgeStatus) => {
  if (status === "low") return "Düşük Risk";
  if (status === "medium") return "Orta Risk";
  if (status === "high") return "Yüksek Risk";
  if (status === "neutral") return "Bilgi";
  if (status === "recommended") return "Önerilen";
  if (status === "low-confidence") return "Düşük Güven";
  return getStatusLabel(status);
};

export function StatusBadge({ status, className }: { status: BadgeStatus; className?: string }) {
  const normalized = status in styleMap ? status : "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        styleMap[normalized],
        className
      )}
      aria-label={`Durum: ${getLabel(normalized)}`}
    >
      {getLabel(normalized)}
    </span>
  );
}
