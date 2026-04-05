"use client";

import { useState } from "react";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { SearchInput } from "@/components/filters/SearchInput";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { initials } from "@/lib/utils";

export function Topbar() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, setMode } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color:var(--surface)]/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <MobileSidebar />

        <div className="min-w-[240px] flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Mac, takim veya lig ara" />
        </div>

        <button
          type="button"
          className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm text-[color:var(--foreground)]"
          aria-label="Bildirimler"
        >
          Bildirim
        </button>

        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as "dark" | "light" | "system")}
          className="h-10 rounded-lg border border-[var(--border)] bg-[color:var(--surface-alt)] px-3 text-sm"
          aria-label="Tema sec"
        >
          <option value="system">Sistem</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[color:var(--surface-alt)] text-sm font-semibold text-[color:var(--foreground)]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {initials("Mert Aydin")}
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-[var(--border)] bg-[color:var(--surface)] p-2 shadow-xl" role="menu">
              <a href="/account" className="block rounded px-2 py-1.5 text-sm hover:bg-[color:var(--surface-alt)]">Profil</a>
              <a href="/membership" className="block rounded px-2 py-1.5 text-sm hover:bg-[color:var(--surface-alt)]">Planlar</a>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <Breadcrumbs />
      </div>
    </header>
  );
}

