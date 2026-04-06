"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarMenu } from "@/lib/config/menu";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#2A3035] bg-[#171C1F] lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-[#2A3035] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A84FF]">
            <span className="text-sm font-bold text-black">T</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#ECEDEF]">
            TahminX
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sidebarMenu.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                        isActive
                          ? "bg-[#7A84FF] text-black"
                          : "text-[#9CA3AF] hover:bg-[#1F2529] hover:text-[#ECEDEF]"
                      )}
                    >
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2A3035] p-4">
        <div className="rounded-lg bg-[#1F2529] p-3">
          <p className="text-xs font-medium text-[#ECEDEF]">Pro Plan</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Sonraki ödeme: 15 gün</p>
        </div>
      </div>
    </aside>
  );
}
