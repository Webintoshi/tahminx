import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning";

export function MetricCard({
  title,
  value,
  subtitle,
  tone = "default"
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: MetricTone;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-[color:var(--surface)] p-3",
        tone === "success" && "border-emerald-500/35",
        tone === "warning" && "border-amber-500/35",
        tone === "default" && "border-[var(--border)]"
      )}
    >
      <p className="text-xs text-[color:var(--muted)]">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-[color:var(--muted)]">{subtitle}</p> : null}
    </article>
  );
}
