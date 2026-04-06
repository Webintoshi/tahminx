"use client";

import { useState } from "react";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { initials } from "@/lib/utils";

export function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, setMode } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-[#2A3035] bg-[#000000]">
      <div className="flex h-16 items-center gap-4 px-6">
        <MobileSidebar />

        {/* Breadcrumbs */}
        <div className="flex-1">
          <Breadcrumbs />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "dark" | "light" | "system")}
            className="h-9 rounded-lg border border-[#2A3035] bg-[#171C1F] px-3 text-sm font-medium text-[#ECEDEF] outline-none transition-colors hover:border-[#3A4047] focus:border-[#7A84FF]"
            aria-label="Tema seç"
          >
            <option value="system">Sistem</option>
            <option value="dark">Koyu</option>
            <option value="light">Açık</option>
          </select>

          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-9 items-center gap-2 rounded-lg border border-[#2A3035] bg-[#171C1F] px-3 text-sm font-medium text-[#ECEDEF] transition-colors hover:border-[#3A4047] hover:bg-[#1F2529]"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A84FF] text-xs font-semibold text-black">
                {initials("Mert Aydin")}
              </span>
              <span className="hidden sm:inline">Mert Aydın</span>
            </button>
            
            {menuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-lg border border-[#2A3035] bg-[#171C1F] py-1 shadow-xl" 
                role="menu"
              >
                <a 
                  href="/account" 
                  className="block px-4 py-2 text-sm text-[#ECEDEF] transition-colors hover:bg-[#1F2529]"
                >
                  Profil
                </a>
                <a 
                  href="/membership" 
                  className="block px-4 py-2 text-sm text-[#ECEDEF] transition-colors hover:bg-[#1F2529]"
                >
                  Planlar
                </a>
                <div className="my-1 border-t border-[#2A3035]" />
                <button 
                  className="block w-full px-4 py-2 text-left text-sm text-[#9CA3AF] transition-colors hover:bg-[#1F2529] hover:text-[#ECEDEF]"
                >
                  Çıkış yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
