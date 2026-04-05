import type { ReactNode } from "react";

export function InfoTooltip({ label, content }: { label: string; content: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] text-[11px] text-[color:var(--muted)]">
        {label}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[color:var(--surface)] p-2 text-xs text-[color:var(--foreground)] opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100">
        {content}
      </span>
    </span>
  );
}

