"use client";

import { useState, type ReactNode } from "react";

type SplitFilterPanelProps = {
  primaryFilters: ReactNode;
  advancedFilters: ReactNode;
  footer?: ReactNode;
  description?: string;
  children?: never;
};

type LegacyFilterPanelProps = {
  children: ReactNode;
  footer?: ReactNode;
  description?: string;
  primaryFilters?: never;
  advancedFilters?: never;
};

type FilterPanelProps = SplitFilterPanelProps | LegacyFilterPanelProps;

export function FilterPanel({
  primaryFilters,
  advancedFilters,
  footer,
  description,
  children
}: FilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const hasLegacyLayout = children !== undefined;

  return (
    <>
      <section className="hidden rounded-xl border border-[#2A3035] bg-[#171C1F] p-4 lg:block">
        {description ? <p className="mb-3 text-xs text-[#9CA3AF]">{description}</p> : null}

        {hasLegacyLayout ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">{primaryFilters}</div>

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="mt-3 text-xs font-medium text-[#9CA3AF] transition-colors hover:text-[#ECEDEF]"
            >
              {showAdvanced ? "Gelismis filtreleri gizle" : "Gelismis filtreleri goster"}
            </button>

            {showAdvanced ? (
              <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-[#2A3035] pt-3">
                {advancedFilters}
              </div>
            ) : null}
          </>
        )}

        {footer ? (
          <div className={hasLegacyLayout ? "mt-3" : "mt-3 border-t border-[#2A3035] pt-3"}>{footer}</div>
        ) : null}
      </section>

      <section className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#ECEDEF]">Filtreler</h3>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-lg border border-[#2A3035] bg-[#1F2529] px-3 py-1.5 text-xs font-medium text-[#ECEDEF]"
          >
            Filtrele
          </button>
        </div>
      </section>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setIsOpen(false);
            }
          }}
        >
          <aside className="ml-auto h-full w-[min(92vw,400px)] overflow-y-auto border-l border-[#2A3035] bg-[#171C1F] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#ECEDEF]">Filtreler</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-[#2A3035] px-3 py-1.5 text-sm text-[#ECEDEF]"
              >
                Kapat
              </button>
            </div>

            {description ? <p className="mb-4 text-xs text-[#9CA3AF]">{description}</p> : null}

            <div className="space-y-4">
              {hasLegacyLayout ? (
                children
              ) : (
                <>
                  {primaryFilters}
                  {advancedFilters}
                </>
              )}
            </div>

            {footer ? <div className="mt-4 border-t border-[#2A3035] pt-4">{footer}</div> : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
