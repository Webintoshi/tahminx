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
        "rounded-2xl border bg-[color:var(--surface)] p-4",
        tone === "success"
          ? "border-emerald-500/35"
          : tone === "warning"
            ? "border-amber-500/35"
            : "border-[var(--border)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">{value || "-"}</p>
        </div>
        {icon ? <span className="text-[color:var(--accent-2)]">{icon}</span> : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-[color:var(--muted)]">{hint}</p> : null}
    </article>
  );
}

