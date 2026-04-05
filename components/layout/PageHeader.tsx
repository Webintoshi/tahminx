import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl text-[color:var(--foreground)] [font-family:var(--font-display)]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

