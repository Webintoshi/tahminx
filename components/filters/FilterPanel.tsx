"use client";

import { useState, type ReactNode } from "react";

export function FilterPanel({
  title = "Filtreler",
  description,
  children,
  footer
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">{title}</h3>
            {description ? <p className="mt-1 text-xs text-[color:var(--muted)]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-alt)] lg:hidden"
            aria-label={`${title} panelini ac`}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            Filtreyi Ac
          </button>
        </div>

        <div className="hidden gap-3 md:grid-cols-2 xl:grid-cols-5 lg:grid">{children}</div>

        {footer ? <div className="mt-3 border-t border-[var(--border)] pt-3">{footer}</div> : null}
      </section>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/55 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} drawer`}
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setIsOpen(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          tabIndex={-1}
        >
          <aside className="ml-auto h-full w-[min(92vw,460px)] overflow-y-auto border-l border-[var(--border)] bg-[color:var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">{title}</h3>
                {description ? <p className="mt-1 text-xs text-[color:var(--muted)]">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-alt)]"
              >
                Kapat
              </button>
            </div>

            <div className="grid gap-3">{children}</div>

            {footer ? <div className="mt-3 border-t border-[var(--border)] pt-3">{footer}</div> : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}

