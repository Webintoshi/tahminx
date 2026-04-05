import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl text-[color:var(--foreground)] [font-family:var(--font-display)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[color:var(--muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

