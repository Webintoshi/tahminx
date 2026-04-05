"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarMenu } from "@/lib/config/menu";
import { cn } from "@/lib/utils";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-lg border border-[var(--border)] px-3 text-sm text-[color:var(--foreground)] lg:hidden"
        aria-label="Menuyu ac"
      >
        Menu
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" role="dialog" aria-modal="true">
          <aside className="h-full w-80 max-w-[90vw] overflow-y-auto bg-[color:var(--surface)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--accent-2)]">TahminX</p>
                <p className="text-lg text-[color:var(--foreground)] [font-family:var(--font-display)]">Navigation</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-[var(--border)] px-2 py-1 text-sm text-[color:var(--foreground)]"
              >
                Kapat
              </button>
            </div>

            {sidebarMenu.map((section) => (
              <div key={section.title} className="mb-5">
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">{section.title}</p>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm",
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
          </aside>
        </div>
      ) : null}
    </>
  );
}

