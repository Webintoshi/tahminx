import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  tone = "default"
}: {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-[color:var(--surface)] p-6 text-center",
        tone === "warning" ? "border-amber-500/35" : "border-[var(--border)]"
      )}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {tone === "warning" ? "Bilgilendirme" : "Bos Durum"}
      </p>
      <h3 className="mt-1 text-xl text-[color:var(--foreground)] [font-family:var(--font-display)]">{title}</h3>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

