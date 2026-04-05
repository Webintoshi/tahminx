"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarMenu } from "@/lib/config/menu";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[color:var(--surface)] lg:flex">
      <div className="border-b border-[var(--border)] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--accent-2)]">TahminX</p>
        <h1 className="mt-2 text-2xl text-[color:var(--foreground)] [font-family:var(--font-display)]">Analytics Hub</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {sidebarMenu.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-2 px-3 text-xs uppercase tracking-[0.13em] text-[color:var(--muted)]">{section.title}</p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition",
                        isActive
                          ? "bg-[color:var(--accent)] text-black"
                          : "text-[color:var(--muted)] hover:bg-[color:var(--surface-alt)] hover:text-[color:var(--foreground)]"
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

