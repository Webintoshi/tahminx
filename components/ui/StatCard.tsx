import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "default"
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-[#171C1F] p-5 transition-colors hover:border-[#3A4047]",
        tone === "success"
          ? "border-[#34C759]/50"
          : tone === "warning"
            ? "border-[#FF9500]/50"
            : "border-[#2A3035]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#ECEDEF]">{value || "-"}</p>
        </div>
        {icon ? <span className="text-[#7A84FF]">{icon}</span> : null}
      </div>
      {hint ? <p className="mt-3 text-xs text-[#9CA3AF]">{hint}</p> : null}
    </article>
  );
}
