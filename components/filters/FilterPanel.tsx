"use client";

import { useState, type ReactNode } from "react";

export function FilterPanel({
  primaryFilters,
  advancedFilters,
  footer
}: {
  primaryFilters: ReactNode;
  advancedFilters: ReactNode;
  footer?: ReactNode;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop View */}
      <section className="hidden lg:block rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
        {/* Primary Filters */}
        <div className="flex flex-wrap items-end gap-3">
          {primaryFilters}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-3 text-xs font-medium text-[#9CA3AF] transition-colors hover:text-[#ECEDEF]"
        >
          {showAdvanced ? "▲ Gelişmiş filtreleri gizle" : "▼ Gelişmiş filtreleri göster"}
        </button>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-[#2A3035] pt-3">
            {advancedFilters}
          </div>
        )}

        {footer && <div className="mt-3 border-t border-[#2A3035] pt-3">{footer}</div>}
      </section>

      {/* Mobile View */}
      <section className="lg:hidden rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
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

      {/* Mobile Drawer */}
      {isOpen && (
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

            <div className="space-y-4">
              {primaryFilters}
              {advancedFilters}
            </div>

            {footer && <div className="mt-4 border-t border-[#2A3035] pt-4">{footer}</div>}
          </aside>
        </div>
      )}
    </>
  );
}
